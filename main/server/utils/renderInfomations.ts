import path from "path";
import { get } from "dot-prop";
import { getRuntimeConfiguration, getResourceSummary, getDehydrateResource, getHydrateResource, renderDehydrateResourceWithSandbox } from "@/frameworks/react-ssr-tool-box/runtime";

import packageJSONContent from "@/package.json";

import type { Request } from "express";

export type PlatformType = "mobile" | "desktop" | "other" | string;

export type ServerSiderRenderParamsType = {
  request: Request
  alias: string
  title?: string
  keywords?: string[]
  description?: string
  content?: any
  platform?: PlatformType
  version?: string
  structured?: any
};

export type MetaInfoType = {
  hostname?: string
  title: string
  keywords: string
  description: string
  platform: PlatformType
  version: string
  structured?: any
};

export type InjectableDehydrateContentType = {
  meta: MetaInfoType
  content: any
};

/** 整理数据 **/
export async function generateInjectableDehydrateContent(params: ServerSiderRenderParamsType): Promise<InjectableDehydrateContentType> {
  const content = params.content;
  const metaInfo: MetaInfoType = {
    hostname: params.request.hostname,
    /** title信息必须存在 **/
    title: params.title || packageJSONContent.title,
    /** description信息如果不存在的话默认使用标题作为description **/
    description: params.description || packageJSONContent.description,
    /** keyword信息需要进行合成操作 **/
    keywords: [get(params, "keywords", [])].join(","),
    /** 设备信息 **/
    platform: params.platform || "desktop",
    /** 项目版本信息 **/
    version: params.version || packageJSONContent.version,
    /** 结构化数据展示 **/
    structured: params.structured
  };
  return { content, meta: metaInfo };
};

/** 生成脱水视图 **/
export async function generateDehydrateHTMLContent(params: ServerSiderRenderParamsType): Promise<string | null> {
  const dehydrateAssets = await getDehydrateResource(params.alias);
  /** 没有脱水渲染物料时的操作 **/
  if (!dehydrateAssets) {
    const _DEHYDRATE_HTML_CONTENT_ = null;
    return _DEHYDRATE_HTML_CONTENT_;
  };
  if (!dehydrateAssets.javascript) {
    const _DEHYDRATE_HTML_CONTENT_ = null;
    return _DEHYDRATE_HTML_CONTENT_;
  };
  if (!dehydrateAssets.javascript[0]) {
    const _DEHYDRATE_HTML_CONTENT_ = null;
    return _DEHYDRATE_HTML_CONTENT_;
  };
  /** 如果存在脱水渲染脚本的话就需要进行脱水视图的渲染 **/
  const _INJECTABLE_DEHYDRATE_CONTENT_ = await generateInjectableDehydrateContent(params);
  const dehydrateHTMLContent = await renderDehydrateResourceWithSandbox(dehydrateAssets.javascript[0], _INJECTABLE_DEHYDRATE_CONTENT_);
  const _DEHYDRATE_HTML_CONTENT_ = dehydrateHTMLContent;
  return _DEHYDRATE_HTML_CONTENT_;
};

/** 生成样式表的相对路径,要根据物料概览来判断是 优先使用注水样式表 还是 优先使用脱水样式表 **/
export async function generateHydrateStyleTagPath(params: ServerSiderRenderParamsType): Promise<string[] | []> {
  const resourceSummary = await getResourceSummary(params.alias);
  if (!resourceSummary) {
    return [];
  };
  const { assetsDirectoryPath, extractResourceDirectoryPath } = await getRuntimeConfiguration();
  if (resourceSummary.hydrate) {
    const hydrateAssets = await getHydrateResource(params.alias);
    if (!hydrateAssets) {
      return [];
    };
    const _HYDRATE_STYLE_SHEET_TAGS_ = get(hydrateAssets, "stylesheet", []).map((stylesheetResourceRelativePath: string) => (
      path.join(extractResourceDirectoryPath, stylesheetResourceRelativePath).replace(assetsDirectoryPath, "")
    ));
    return _HYDRATE_STYLE_SHEET_TAGS_;
  };
  if (resourceSummary.dehydrate) {
    const dehydratedAssets = await getDehydrateResource(params.alias);
    if (!dehydratedAssets) {
      return [];
    };
    const _HYDRATE_STYLE_SHEET_TAGS_ = get(dehydratedAssets, "stylesheet", []).map((stylesheetResourceRelativePath: string) => (
      path.join(extractResourceDirectoryPath, stylesheetResourceRelativePath).replace(assetsDirectoryPath, "")
    ));
    return _HYDRATE_STYLE_SHEET_TAGS_;
  };
};

/** 注水标签的相对路径 **/
export async function generateHydrateScriptTagPath(params: ServerSiderRenderParamsType): Promise<string[] | []> {
  const { assetsDirectoryPath, hydrateResourceDirectoryPath } = await getRuntimeConfiguration();
  const hydrateAssets = await getHydrateResource(params.alias);
  if (!hydrateAssets) {
    return [];
  };
  const _HYDRATE_SCRIPT_TAGS_ = get(hydrateAssets, "javascript", []).map((javascriptResourceRelativePath: string) => (
    path.join(hydrateResourceDirectoryPath, javascriptResourceRelativePath).replace(assetsDirectoryPath, "")
  ));
  return _HYDRATE_SCRIPT_TAGS_;
};
