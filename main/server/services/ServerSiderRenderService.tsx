import React from "react";
import pretty from "pretty";
import { injectable } from "inversify";
import { renderToString } from "react-dom/server";

import { IOCContainer } from "@/main/server/cores/IOCContainer";
import { generateInjectableDehydrateContent, generateHydrateScriptTagPath, generateHydrateStyleTagPath } from "@/main/server/utils/renderInfomations";

import type { ServerSiderRenderParamsType } from "@/main/server/utils/renderInfomations";

@injectable()
export class ServerSiderRenderService {


  public async render(params: ServerSiderRenderParamsType): Promise<string> {
    const _INJECTABLE_DEHYDRATE_CONTENT_ = await generateInjectableDehydrateContent(params);
    const _HYDRATE_SCRIPT_TAGS_ = await generateHydrateScriptTagPath(params);
    const _HYDRATE_STYLE_TAGS_ = await generateHydrateStyleTagPath(params);
    const contentString = renderToString(
      <html lang="zh-CN">
        <head>
          <meta charSet="UTF-8" />
          <title>{_INJECTABLE_DEHYDRATE_CONTENT_.meta.title}</title>
          <meta name="keywords" content={_INJECTABLE_DEHYDRATE_CONTENT_.meta.keywords} />
          <meta name="description" content={_INJECTABLE_DEHYDRATE_CONTENT_.meta.description} />
          <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
          <meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no" />
          <meta name="referrer" content="no-referrer-when-downgrade" />
          <link href="/favicon.ico" rel="icon" type="image/x-icon" />
          {/** 注水样式 **/}
          {(_HYDRATE_STYLE_TAGS_).map((everyHydrateStyleTagPath: string) => {
            return (<link rel="stylesheet" key={everyHydrateStyleTagPath} href={everyHydrateStyleTagPath} />)
          })}
        </head>
        <body>
          {/** 脱水内容 **/}
          <div id="root"></div>
          {/** 注入环境变量 **/}
          <script type="text/javascript" dangerouslySetInnerHTML={{ __html: `process={env:{NODE_ENV:${JSON.stringify(process.env.NODE_ENV)}}};` }} />
          {/** 引用注水脚本 **/}
          {(_HYDRATE_SCRIPT_TAGS_).map((everyHydrateScriptTagPath: string) => {
            return (<script type="text/javascript" key={everyHydrateScriptTagPath} src={everyHydrateScriptTagPath} />)
          })}
          {/** 触发注水脚本 **/}
          <script type="text/javascript" dangerouslySetInnerHTML={{ __html: `window.hydrateBootstrap({rootElement:document.getElementById("root"),dehydrateData:${JSON.stringify(_INJECTABLE_DEHYDRATE_CONTENT_)}});` }} />
        </body>
      </html>
    );
    return ["<!DOCTYPE html>", pretty(contentString)].join("\n");
  };

};

IOCContainer.bind(ServerSiderRenderService).toSelf().inRequestScope();