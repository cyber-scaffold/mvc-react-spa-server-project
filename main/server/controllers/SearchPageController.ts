import { Router } from "express";
import { injectable, inject } from "inversify";

import { IOCContainer } from "@/main/server/cores/IOCContainer";
import { ServerSiderRenderService } from "@/main/server/services/ServerSiderRenderService";
import { responseHtmlWrapper } from "@/main/server/utils/responseHtmlWrapper";

import type { Request } from "express";

@injectable()
export class SearchPageController {

  constructor (
    @inject(ServerSiderRenderService) private readonly $ServerSiderRenderService: ServerSiderRenderService
  ) { };

  /** 注册路由的方法 **/
  public getRouter() {
    return Router().get("/search", responseHtmlWrapper(async (request: Request) => {
      return await this.execute(request);
    }));
  };

  /** 路由的业务逻辑 **/
  public async execute(request: Request): Promise<string> {
    console.log("request.query", request.query);
    console.log("request.body", request.body);
    const content = { list: Array(10).fill(1) };
    return await this.$ServerSiderRenderService.render({
      request,
      alias: "SearchPage",
      title: "搜索结果页",
      keywords: [],
      description: "",
      content: content
    });
  };

};

IOCContainer.bind(SearchPageController).toSelf().inRequestScope();