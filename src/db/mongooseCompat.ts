import bcrypt from "bcryptjs";
import { Aggregator, Query as MingoQuery } from "mingo";
import "mingo/init/system";
import { ObjectId } from "mongodb";
import prisma from "@/db/prisma";

type PlainObject = Record<string, any>;
type SortSpec = string | Record<string, any>;
type SelectSpec = string | Record<string, any> | undefined;

type HookCtx = {
  isNew: boolean;
  previous?: PlainObject | null;
};

type RelationConfig = {
  model?: string | (() => any) | any;
  select?: SelectSpec;
  count?: boolean;
  localField?: string;
  foreignField?: string;
  resolver?: (value: any, parent: any, doc: any) => Promise<any>;
};

type ModelOptions = {
  modelName: string;
  delegate: string;
  collectionName: string;
  defaults?: PlainObject | (() => PlainObject);
  uniqueFields?: string[];
  beforeSave?: (doc: PlainObject, ctx: HookCtx) => Promise<void> | void;
  afterSave?: (doc: PlainObject, ctx: HookCtx) => Promise<void> | void;
  afterDelete?: (doc: PlainObject) => Promise<void> | void;
  relations?: Record<string, RelationConfig>;
  methods?: Record<string, (...args: any[]) => any>;
  statics?: Record<string, any>;
};

export interface CompatQueryResult<T = any> extends PromiseLike<T> {
  select(spec: SelectSpec): CompatQueryResult<T>;
  populate(path: any, select?: SelectSpec): CompatQueryResult<T>;
  sort(spec: SortSpec): CompatQueryResult<T>;
  skip(n: number): CompatQueryResult<T>;
  limit(n: number): CompatQueryResult<T>;
  lean<TNext = any>(flag?: boolean): CompatQueryResult<TNext>;
  collation(opts: any): CompatQueryResult<T>;
  exec(): Promise<T>;
  catch<TResult = never>(
    onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | null,
  ): Promise<T | TResult>;
  finally(onfinally?: (() => void) | null): Promise<T>;
}

export interface CompatModelClass {
  new (data?: PlainObject, isNew?: boolean): any;
  __compatModel: any;
  collection: { name: string };
  modelName: string;
  find(filter?: PlainObject, projection?: SelectSpec): CompatQueryResult<any[]>;
  findOne(filter?: PlainObject, projection?: SelectSpec): CompatQueryResult<any | null>;
  findById(id: any, projection?: SelectSpec): CompatQueryResult<any | null>;
  findByIdAndUpdate(id: any, update: any, opts?: any): CompatQueryResult<any | null>;
  findOneAndUpdate(filter: PlainObject, update: any, opts?: any): CompatQueryResult<any | null>;
  findByIdAndDelete(id: any): CompatQueryResult<any | null>;
  findOneAndDelete(filter?: PlainObject): CompatQueryResult<any | null>;
  create(payload: any, options?: any): Promise<any>;
  insertMany(payload: any[]): Promise<any>;
  updateOne(filter: PlainObject, update: any): Promise<any>;
  updateMany(filter: PlainObject, update: any): Promise<any>;
  deleteOne(filter: PlainObject): Promise<any>;
  deleteMany(filter: PlainObject): Promise<any>;
  countDocuments(filter?: PlainObject): Promise<number>;
  distinct(path: string, filter?: PlainObject): Promise<any[]>;
  exists(filter?: PlainObject): Promise<{ _id: string } | null>;
  aggregate(pipeline: any[]): PromiseLike<any[]> & { exec(): Promise<any[]> };
  [key: string]: any;
}

type PopulateInput =
  | string
  | {
      path: string;
      select?: SelectSpec;
      model?: any;
    }
  | Array<
      | string
      | {
          path: string;
          select?: SelectSpec;
          model?: any;
        }
    >;

const modelRegistry = new Map<string, CompatModel>();
const collectionRegistry = new Map<string, CompatModel>();

function registerModel(model: CompatModel) {
  modelRegistry.set(model.modelName, model);
  collectionRegistry.set(model.collectionName, model);
}

function resolveModel(ref: any): CompatModel | undefined {
  if (!ref) return undefined;
  if (typeof ref === "string") return modelRegistry.get(ref) ?? collectionRegistry.get(ref);
  if (typeof ref === "function" && ref.__compatModel) return ref.__compatModel;
  if (typeof ref === "function") {
    const result = ref();
    if (result?.__compatModel) return result.__compatModel;
  }
  if (ref.__compatModel) return ref.__compatModel;
  return undefined;
}

function isObject(value: unknown): value is PlainObject {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function isObjectIdLike(value: unknown): boolean {
  if (!value) return false;
  if (value instanceof ObjectId) return true;
  const ctor = (value as any).constructor?.name;
  return ctor === "ObjectId" && typeof (value as any).toString === "function";
}

function normalizeValue(value: any): any {
  if (value === null || value === undefined) return value;
  if (value instanceof Date) return new Date(value);
  if (value instanceof RegExp) return new RegExp(value.source, value.flags);
  if (isObjectIdLike(value)) return value.toString();
  if (value instanceof Map) {
    const out: PlainObject = {};
    for (const [k, v] of value.entries()) out[String(k)] = normalizeValue(v);
    return out;
  }
  if (Array.isArray(value)) return value.map((v) => normalizeValue(v));
  if (isObject(value)) {
    const out: PlainObject = {};
    for (const [k, v] of Object.entries(value)) out[k] = normalizeValue(v);
    return out;
  }
  return value;
}

function deepClone<T>(value: T): T {
  return normalizeValue(value);
}

function getByPath(obj: any, path: string): any {
  if (!obj) return undefined;
  const parts = path.split(".");
  let cur = obj;
  for (const part of parts) {
    if (cur == null) return undefined;
    cur = cur[part];
  }
  return cur;
}

function setByPath(obj: any, path: string, value: any) {
  const parts = path.split(".");
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const p = parts[i];
    if (!isObject(cur[p])) cur[p] = {};
    cur = cur[p];
  }
  cur[parts[parts.length - 1]] = value;
}

function unsetByPath(obj: any, path: string) {
  const parts = path.split(".");
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i += 1) {
    cur = cur?.[parts[i]];
    if (!cur) return;
  }
  if (cur && Object.prototype.hasOwnProperty.call(cur, parts[parts.length - 1])) {
    delete cur[parts[parts.length - 1]];
  }
}

function removeUndefinedFields(input: PlainObject): PlainObject {
  const out: PlainObject = {};
  for (const [k, v] of Object.entries(input)) {
    if (v !== undefined) out[k] = v;
  }
  return out;
}

function generateObjectId() {
  return new ObjectId().toString();
}

function parseSortSpec(sort?: SortSpec): Array<[string, 1 | -1]> {
  if (!sort) return [];
  if (typeof sort === "string") {
    const trimmed = sort.trim();
    if (!trimmed) return [];
    return trimmed
      .split(/\s+/)
      .map((token) => token.trim())
      .filter(Boolean)
      .map((token) => {
        if (token.startsWith("-")) return [token.slice(1), -1] as [string, 1 | -1];
        return [token, 1] as [string, 1 | -1];
      });
  }
  const out: Array<[string, 1 | -1]> = [];
  for (const [k, v] of Object.entries(sort)) {
    if (isObject(v) && "$meta" in v) continue;
    if (v === -1 || v === "desc" || v === "descending") out.push([k, -1]);
    else out.push([k, 1]);
  }
  return out;
}

function comparePrimitive(a: any, b: any): number {
  if (a === b) return 0;
  if (a === undefined || a === null) return -1;
  if (b === undefined || b === null) return 1;
  const aa = a instanceof Date ? a.getTime() : a;
  const bb = b instanceof Date ? b.getTime() : b;
  if (aa < bb) return -1;
  if (aa > bb) return 1;
  return 0;
}

function sortDocs(docs: PlainObject[], sort?: SortSpec): PlainObject[] {
  const fields = parseSortSpec(sort);
  if (!fields.length) return docs;
  return [...docs].sort((a, b) => {
    for (const [path, dir] of fields) {
      const av = getByPath(a, path);
      const bv = getByPath(b, path);
      const cmp = comparePrimitive(av, bv);
      if (cmp !== 0) return cmp * dir;
    }
    return 0;
  });
}

function parseSelect(select: SelectSpec): Record<string, any> | null {
  if (!select) return null;
  if (typeof select === "string") {
    const tokens = select
      .split(/\s+/)
      .map((t) => t.trim())
      .filter(Boolean);
    if (!tokens.length) return null;
    const projection: Record<string, any> = {};
    for (const token of tokens) {
      const clean = token.startsWith("+") ? token.slice(1) : token;
      if (!clean) continue;
      if (clean.startsWith("-")) projection[clean.slice(1)] = 0;
      else projection[clean] = 1;
    }
    return projection;
  }
  return { ...select };
}

function applySelect(docs: PlainObject[], select: SelectSpec): PlainObject[] {
  const projection = parseSelect(select);
  if (!projection) return docs;
  const agg = new Aggregator([{ $project: projection }]);
  return docs.map((d) => {
    const projected = agg.run([deepClone(d)])[0];
    return projected ?? {};
  });
}

function normalizeFilter(filter: any): any {
  return normalizeValue(filter ?? {});
}

function hasTextFilter(filter: any): boolean {
  if (!isObject(filter)) return false;
  if (Object.prototype.hasOwnProperty.call(filter, "$text")) return true;
  return Object.values(filter).some((v) => hasTextFilter(v));
}

function applyUpdate(doc: PlainObject, update: any): PlainObject {
  const next = deepClone(doc);
  if (Array.isArray(update)) {
    const agg = new Aggregator(update as any[]);
    const out = agg.run([next])[0];
    return out ?? next;
  }
  const normalized = normalizeValue(update ?? {});
  const opKeys = Object.keys(normalized).filter((k) => k.startsWith("$"));
  if (!opKeys.length) {
    return { ...next, ...normalized };
  }
  if (normalized.$set && isObject(normalized.$set)) {
    for (const [k, v] of Object.entries(normalized.$set)) {
      setByPath(next, k, v);
    }
  }
  if (normalized.$unset && isObject(normalized.$unset)) {
    for (const k of Object.keys(normalized.$unset)) {
      unsetByPath(next, k);
    }
  }
  if (normalized.$inc && isObject(normalized.$inc)) {
    for (const [k, v] of Object.entries(normalized.$inc)) {
      const cur = Number(getByPath(next, k) ?? 0);
      setByPath(next, k, cur + Number(v));
    }
  }
  return next;
}

class CompatQuery<T = any> {
  private selectSpec: SelectSpec;
  private populateSpecs: PopulateInput[] = [];
  private sortSpec: SortSpec | undefined;
  private skipCount = 0;
  private limitCount: number | undefined;
  private leanMode = false;

  constructor(
    private readonly model: CompatModel,
    private readonly runner: () => Promise<PlainObject[]>,
    private readonly single: boolean,
    selectSpec?: SelectSpec,
  ) {
    this.selectSpec = selectSpec;
  }

  select(spec: SelectSpec) {
    this.selectSpec = spec;
    return this;
  }

  populate(path: any, select?: SelectSpec) {
    if (typeof path === "string" && select) {
      const paths = path
        .split(/\s+/)
        .map((p) => p.trim())
        .filter(Boolean);
      for (const onePath of paths) {
        this.populateSpecs.push({ path: onePath, select });
      }
      return this;
    }
    this.populateSpecs.push(path);
    return this;
  }

  sort(spec: SortSpec) {
    this.sortSpec = spec;
    return this;
  }

  skip(n: number) {
    this.skipCount = Math.max(0, Number(n) || 0);
    return this;
  }

  limit(n: number) {
    const parsed = Number(n);
    if (Number.isFinite(parsed)) this.limitCount = Math.max(0, parsed);
    return this;
  }

  lean<TNext = any>(flag = true): CompatQuery<TNext> {
    this.leanMode = flag;
    return this as unknown as CompatQuery<TNext>;
  }

  collation(_opts: any) {
    return this;
  }

  async exec(): Promise<T> {
    let docs = await this.runner();
    docs = sortDocs(docs, this.sortSpec);
    if (this.skipCount) docs = docs.slice(this.skipCount);
    if (this.limitCount !== undefined) docs = docs.slice(0, this.limitCount);
    docs = await this.model.applyPopulateMany(docs, this.populateSpecs);
    docs = applySelect(docs, this.selectSpec);

    if (this.single) {
      const one = docs.length ? docs[0] : null;
      if (this.leanMode) return one as T;
      return (one ? this.model.wrapDocument(one, false) : null) as T;
    }

    if (this.leanMode) return docs as T;
    return docs.map((d) => this.model.wrapDocument(d, false)) as T;
  }

  then<TResult1 = T, TResult2 = never>(
    onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return this.exec().then(onfulfilled as any, onrejected as any);
  }

  catch<TResult = never>(
    onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | null,
  ): Promise<T | TResult> {
    return this.exec().catch(onrejected as any);
  }

  finally(onfinally?: (() => void) | null): Promise<T> {
    return this.exec().finally(onfinally as any);
  }
}

class CompatAggregate {
  constructor(private readonly runner: () => Promise<any[]>) {}

  exec() {
    return this.runner();
  }

  then<TResult1 = any, TResult2 = never>(
    onfulfilled?: ((value: any[]) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return this.exec().then(onfulfilled as any, onrejected as any);
  }

  catch<TResult = never>(
    onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | null,
  ): Promise<any[] | TResult> {
    return this.exec().catch(onrejected as any);
  }

  finally(onfinally?: (() => void) | null): Promise<any[]> {
    return this.exec().finally(onfinally as any);
  }
}

class CompatModel {
  public ctor: any;
  public readonly modelName: string;
  public readonly delegate: string;
  public readonly collectionName: string;

  constructor(private readonly opts: ModelOptions) {
    this.modelName = opts.modelName;
    this.delegate = opts.delegate;
    this.collectionName = opts.collectionName;
  }

  setCtor(ctor: any) {
    this.ctor = ctor;
  }

  get relationMap() {
    return this.opts.relations ?? {};
  }

  wrapDocument(data: PlainObject, isNew: boolean) {
    return new this.ctor(data, isNew);
  }

  rowToDoc(row: any): PlainObject {
    const data = normalizeValue(row?.data ?? {});
    return {
      _id: String(row.id),
      ...data,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  docToRowData(doc: PlainObject) {
    const cloned = normalizeValue(doc);
    delete cloned._id;
    delete cloned.id;
    delete cloned.createdAt;
    delete cloned.updatedAt;
    return cloned;
  }

  async readAllDocs(): Promise<PlainObject[]> {
    const rows = await (prisma as any)[this.delegate].findMany();
    return rows.map((r: any) => this.rowToDoc(r));
  }

  async readOneById(id: string): Promise<PlainObject | null> {
    const row = await (prisma as any)[this.delegate].findUnique({ where: { id } });
    return row ? this.rowToDoc(row) : null;
  }

  async findPlainMany(filter: PlainObject = {}): Promise<PlainObject[]> {
    const normalizedFilter = normalizeFilter(filter);
    if (hasTextFilter(normalizedFilter)) {
      throw new Error("text index required for $text query");
    }
    const onlyId =
      normalizedFilter &&
      Object.keys(normalizedFilter).length === 1 &&
      Object.prototype.hasOwnProperty.call(normalizedFilter, "_id") &&
      typeof normalizedFilter._id === "string";
    if (onlyId) {
      const one = await this.readOneById(normalizedFilter._id);
      return one ? [one] : [];
    }

    const docs = await this.readAllDocs();
    if (!normalizedFilter || !Object.keys(normalizedFilter).length) return docs;
    const q = new MingoQuery(normalizedFilter);
    return docs.filter((doc) => q.test(doc));
  }

  async findPlainOne(filter: PlainObject = {}, sort?: SortSpec): Promise<PlainObject | null> {
    const docs = sortDocs(await this.findPlainMany(filter), sort);
    return docs.length ? docs[0] : null;
  }

  async ensureUnique(doc: PlainObject, idToIgnore?: string) {
    if (!this.opts.uniqueFields?.length) return;
    const all = await this.readAllDocs();
    for (const field of this.opts.uniqueFields) {
      const val = getByPath(doc, field);
      if (val === undefined || val === null || val === "") continue;
      const exists = all.find((d) => String(d._id) !== String(idToIgnore ?? "") && getByPath(d, field) === val);
      if (exists) {
        const err: any = new Error(
          `E11000 duplicate key error collection: ${this.collectionName} index: ${field}_1 dup key`,
        );
        err.code = 11000;
        throw err;
      }
    }
  }

  async persist(doc: PlainObject, isNew: boolean, ctx: HookCtx): Promise<PlainObject> {
    const payload = normalizeValue(doc);
    if (!payload._id) payload._id = generateObjectId();

    const defaults = this.opts.defaults;
    if (isNew && defaults) {
      const defaultsObj = typeof defaults === "function" ? defaults() : defaults;
      for (const [k, v] of Object.entries(defaultsObj)) {
        if (payload[k] === undefined) payload[k] = deepClone(v);
      }
    }

    if (this.opts.beforeSave) {
      await this.opts.beforeSave(payload, ctx);
    }

    await this.ensureUnique(payload, isNew ? undefined : payload._id);

    const rowData = removeUndefinedFields(this.docToRowData(payload));
    const delegate = (prisma as any)[this.delegate];

    if (isNew) {
      await delegate.create({
        data: {
          id: String(payload._id),
          data: rowData,
          createdAt: payload.createdAt ? new Date(payload.createdAt) : undefined,
        },
      });
    } else {
      await delegate.update({
        where: { id: String(payload._id) },
        data: { data: rowData },
      });
    }

    const saved = await this.readOneById(String(payload._id));
    if (!saved) throw new Error(`${this.modelName} persistence failed`);

    if (this.opts.afterSave) {
      await this.opts.afterSave(saved, ctx);
    }

    return saved;
  }

  async deleteById(id: string): Promise<PlainObject | null> {
    const existing = await this.readOneById(id);
    if (!existing) return null;
    await (prisma as any)[this.delegate].delete({ where: { id } });
    if (this.opts.afterDelete) await this.opts.afterDelete(existing);
    return existing;
  }

  makeQuery<T = any>(runner: () => Promise<PlainObject[]>, single: boolean, selectSpec?: SelectSpec) {
    return new CompatQuery<T>(this, runner, single, selectSpec);
  }

  parsePopulate(populate: PopulateInput): Array<{ path: string; select?: SelectSpec; model?: any }> {
    const out: Array<{ path: string; select?: SelectSpec; model?: any }> = [];
    if (Array.isArray(populate)) {
      for (const p of populate) out.push(...this.parsePopulate(p));
      return out;
    }
    if (typeof populate === "string") {
      const paths = populate
        .split(/\s+/)
        .map((p) => p.trim())
        .filter(Boolean);
      for (const path of paths) out.push({ path });
      return out;
    }
    out.push({ path: populate.path, select: populate.select, model: populate.model });
    return out;
  }

  async applyPopulateMany(docs: PlainObject[], populateInputs: PopulateInput[]) {
    let result = docs.map((d) => deepClone(d));
    for (const input of populateInputs) {
      const specs = this.parsePopulate(input);
      for (const spec of specs) {
        result = await this.populatePath(result, spec.path, spec.select, spec.model);
      }
    }
    return result;
  }

  async populatePath(
    docs: PlainObject[],
    path: string,
    select?: SelectSpec,
    explicitModel?: any,
  ): Promise<PlainObject[]> {
    if (!docs.length) return docs;
    const relation = this.relationMap[path] ?? {};
    const model =
      resolveModel(explicitModel) ??
      resolveModel((relation as RelationConfig).model) ??
      undefined;
    const cfg = relation as RelationConfig;

    if (cfg.count) {
      const local = cfg.localField ?? "_id";
      const foreign = cfg.foreignField;
      if (!model || !foreign) return docs;
      const relatedDocs = await model.readAllDocs();
      return docs.map((doc) => {
        const localVal = getByPath(doc, local);
        const count = relatedDocs.filter((rd) => getByPath(rd, foreign) === localVal).length;
        const out = deepClone(doc);
        out[path] = count;
        return out;
      });
    }

    if (cfg.resolver) {
      const outDocs = deepClone(docs);
      for (const doc of outDocs) {
        await this.walkPopulatePath(doc, path.split("."), async (value, parent) => {
          if (value === null || value === undefined) return value;
          return cfg.resolver!(value, parent, doc);
        });
      }
      return outDocs;
    }

    if (!model) return docs;

    const ids = new Set<string>();
    const collector = async (value: any) => {
      if (Array.isArray(value)) {
        for (const v of value) {
          if (v !== null && v !== undefined) ids.add(String(normalizeValue(v)));
        }
      } else if (value !== null && value !== undefined) {
        ids.add(String(normalizeValue(value)));
      }
      return value;
    };

    for (const doc of docs) {
      await this.walkPopulatePath(doc, path.split("."), collector);
    }

    if (!ids.size) return docs;

    const related = await model.findPlainMany({ _id: { $in: Array.from(ids) } });
    const selected = applySelect(related, select ?? cfg.select);
    const map = new Map<string, any>();
    for (const r of selected) map.set(String(r._id), r);

    const outDocs = deepClone(docs);
    for (const doc of outDocs) {
      await this.walkPopulatePath(doc, path.split("."), async (value) => {
        if (Array.isArray(value)) {
          return value.map((v) => map.get(String(normalizeValue(v))) ?? v);
        }
        if (value === null || value === undefined) return value;
        return map.get(String(normalizeValue(value))) ?? value;
      });
    }
    return outDocs;
  }

  async walkPopulatePath(
    obj: any,
    parts: string[],
    mapper: (value: any, parent?: any) => Promise<any>,
    parent?: any,
  ): Promise<any> {
    if (!obj) return obj;
    if (!parts.length) return mapper(obj, parent);
    const [head, ...rest] = parts;

    if (Array.isArray(obj)) {
      for (let i = 0; i < obj.length; i += 1) {
        obj[i] = await this.walkPopulatePath(obj[i], parts, mapper, obj);
      }
      return obj;
    }

    if (!Object.prototype.hasOwnProperty.call(obj, head)) return obj;
    if (!rest.length) {
      obj[head] = await mapper(obj[head], obj);
      return obj;
    }

    obj[head] = await this.walkPopulatePath(obj[head], rest, mapper, obj);
    return obj;
  }
}

class BaseCompatDocument {
  private __model: CompatModel;
  private __isNew: boolean;

  constructor(model: CompatModel, data: PlainObject = {}, isNew = true) {
    this.__model = model;
    this.__isNew = isNew;
    Object.assign(this, deepClone(data));
    if (!(this as any)._id) (this as any)._id = generateObjectId();
  }

  get isNew() {
    return this.__isNew;
  }

  get id() {
    return String((this as any)._id);
  }

  set(pathOrObj: any, value?: any) {
    if (typeof pathOrObj === "string") {
      setByPath(this, pathOrObj, value);
      return this;
    }
    if (isObject(pathOrObj)) Object.assign(this, deepClone(pathOrObj));
    return this;
  }

  markModified(_path: string) {
    return this;
  }

  toObject() {
    const out = deepClone(this as any);
    delete out.__model;
    delete out.__isNew;
    return out;
  }

  toJSON() {
    return this.toObject();
  }

  async save() {
    const current = this.toObject();
    const previous = this.__isNew ? null : await this.__model.readOneById(String(current._id));
    const saved = await this.__model.persist(current, this.__isNew, {
      isNew: this.__isNew,
      previous,
    });
    Object.keys(this as any).forEach((k) => {
      if (!k.startsWith("__")) delete (this as any)[k];
    });
    Object.assign(this, deepClone(saved));
    this.__isNew = false;
    return this;
  }

  async deleteOne() {
    await this.__model.deleteById(String((this as any)._id));
    return { acknowledged: true, deletedCount: 1 };
  }
}

function bindInstanceMethods(ctor: any, methods?: Record<string, (...args: any[]) => any>) {
  if (!methods) return;
  for (const [name, fn] of Object.entries(methods)) {
    ctor.prototype[name] = fn;
  }
}

function bindStatics(ctor: any, statics?: Record<string, any>) {
  if (!statics) return;
  for (const [name, value] of Object.entries(statics)) {
    ctor[name] = value;
  }
}

export function createCompatModel(options: ModelOptions): CompatModelClass {
  const compat = new CompatModel(options);

  class Model extends BaseCompatDocument {
    static __compatModel = compat;
    static collection = { name: options.collectionName };
    static modelName = options.modelName;

    constructor(data: PlainObject = {}, isNew = true) {
      super(compat, data, isNew);
    }

    static find(filter: PlainObject = {}, projection?: SelectSpec) {
      return compat.makeQuery<any[]>(async () => compat.findPlainMany(filter), false, projection);
    }

    static findOne(filter: PlainObject = {}, projection?: SelectSpec) {
      return compat.makeQuery<any | null>(async () => {
        const one = await compat.findPlainOne(filter);
        return one ? [one] : [];
      }, true, projection);
    }

    static findById(id: any, projection?: SelectSpec) {
      return compat.makeQuery<any | null>(async () => {
        const one = await compat.readOneById(String(normalizeValue(id)));
        return one ? [one] : [];
      }, true, projection);
    }

    static async create(payload: any, _options?: any): Promise<any> {
      if (Array.isArray(payload)) {
        const docs = [];
        for (const one of payload) {
          const doc = new Model(one, true);
          await doc.save();
          docs.push(doc);
        }
        return docs;
      }
      const doc = new Model(payload, true);
      await doc.save();
      return doc;
    }

    static async insertMany(payload: any[]) {
      return Model.create(payload);
    }

    static findByIdAndUpdate(id: any, update: any, opts: any = {}) {
      return compat.makeQuery<any | null>(async () => {
        const targetId = String(normalizeValue(id));
        const existing = await compat.readOneById(targetId);
        if (!existing && !opts.upsert) return [];

        const base = existing ?? { _id: targetId };
        const next = applyUpdate(base, update);
        next._id = targetId;

        const saved = await compat.persist(next, !existing, {
          isNew: !existing,
          previous: existing ?? null,
        });

        const out = opts.new ? saved : base;
        return out ? [out] : [];
      }, true);
    }

    static findOneAndUpdate(filter: PlainObject, update: any, opts: any = {}) {
      return compat.makeQuery<any | null>(async () => {
        const existing = await compat.findPlainOne(filter);
        if (!existing && !opts.upsert) return [];

        const isNew = !existing;
        const seed = existing
          ? deepClone(existing)
          : {
              _id: generateObjectId(),
              ...Object.fromEntries(
                Object.entries(normalizeValue(filter)).filter(([k]) => !k.startsWith("$"))
              ),
            };

        const base = deepClone(seed);
        const next = applyUpdate(seed, update);
        next._id = base._id;

        const saved = await compat.persist(next, isNew, {
          isNew,
          previous: existing ?? null,
        });
        const out = opts.new ? saved : existing ?? null;
        return out ? [out] : [];
      }, true);
    }

    static async updateOne(filter: PlainObject, update: any) {
      const docs = await compat.findPlainMany(filter);
      if (!docs.length) return { acknowledged: true, matchedCount: 0, modifiedCount: 0 };
      const target = docs[0];
      const next = applyUpdate(target, update);
      next._id = target._id;
      await compat.persist(next, false, { isNew: false, previous: target });
      return { acknowledged: true, matchedCount: 1, modifiedCount: 1 };
    }

    static async updateMany(filter: PlainObject, update: any) {
      const docs = await compat.findPlainMany(filter);
      if (!docs.length) return { acknowledged: true, matchedCount: 0, modifiedCount: 0 };
      let modified = 0;
      for (const doc of docs) {
        const next = applyUpdate(doc, update);
        next._id = doc._id;
        await compat.persist(next, false, { isNew: false, previous: doc });
        modified += 1;
      }
      return { acknowledged: true, matchedCount: docs.length, modifiedCount: modified };
    }

    static async deleteOne(filter: PlainObject) {
      const one = await compat.findPlainOne(filter);
      if (!one) return { acknowledged: true, deletedCount: 0 };
      await compat.deleteById(String(one._id));
      return { acknowledged: true, deletedCount: 1 };
    }

    static async deleteMany(filter: PlainObject) {
      const docs = await compat.findPlainMany(filter);
      for (const doc of docs) {
        await compat.deleteById(String(doc._id));
      }
      return { acknowledged: true, deletedCount: docs.length };
    }

    static findByIdAndDelete(id: any) {
      return compat.makeQuery<any | null>(async () => {
        const doc = await compat.deleteById(String(normalizeValue(id)));
        return doc ? [doc] : [];
      }, true);
    }

    static findOneAndDelete(filter: PlainObject = {}) {
      return compat.makeQuery<any | null>(async () => {
        const doc = await compat.findPlainOne(filter);
        if (!doc) return [];
        await compat.deleteById(String(doc._id));
        return [doc];
      }, true);
    }

    static async countDocuments(filter: PlainObject = {}) {
      const docs = await compat.findPlainMany(filter);
      return docs.length;
    }

    static async distinct(path: string, filter: PlainObject = {}) {
      const docs = await compat.findPlainMany(filter);
      const values = new Map<string, any>();
      for (const doc of docs) {
        const val = getByPath(doc, path);
        if (Array.isArray(val)) {
          for (const v of val) values.set(JSON.stringify(v), normalizeValue(v));
        } else if (val !== undefined) {
          values.set(JSON.stringify(val), normalizeValue(val));
        }
      }
      return Array.from(values.values());
    }

    static async exists(filter: PlainObject = {}) {
      const one = await compat.findPlainOne(filter);
      return one ? { _id: one._id } : null;
    }

    static aggregate(pipeline: any[]) {
      return new CompatAggregate(async () => {
        const source = await compat.readAllDocs();
        const collectionData = new Map<string, any[]>();
        for (const [name, model] of collectionRegistry.entries()) {
          collectionData.set(name, await model.readAllDocs());
        }
        const agg = new Aggregator(normalizeValue(pipeline), {
          collectionResolver: (collectionName: string) => {
            return collectionData.get(collectionName) ?? [];
          },
        } as any);
        const resolved = agg.run(source as any);
        return normalizeValue(resolved);
      });
    }
  }

  bindInstanceMethods(Model, options.methods);
  bindStatics(Model, options.statics);
  compat.setCtor(Model);
  registerModel(compat);

  return Model as unknown as CompatModelClass;
}

export const utils = {
  bcrypt,
  generateObjectId,
  normalizeValue,
  getByPath,
  setByPath,
  deepClone,
  resolveModel,
};
