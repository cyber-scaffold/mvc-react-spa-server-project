import { Router } from "express";
import { injectable, inject } from "inversify";

import { IOCContainer } from "@/main/server/cores/IOCContainer";
import { ServerSiderRenderService } from "@/main/server/services/ServerSiderRenderService";
import { responseHtmlWrapper } from "@/main/server/utils/responseHtmlWrapper";

import type { Request } from "express";

@injectable()
export class DetailPageController {

  constructor (
    @inject(ServerSiderRenderService) private readonly $ServerSiderRenderService: ServerSiderRenderService
  ) { };

  /** 注册路由的方法 **/
  public getRouter() {
    return Router().get("/detail", responseHtmlWrapper(async (request: Request) => {
      return await this.execute(request);
    }));
  };

  /** 路由的业务逻辑 **/
  public async execute(request: Request): Promise<string> {
    return await this.$ServerSiderRenderService.render({
      request,
      alias: "DetailPage",
      title: "详情页",
      keywords: [],
      description: "这是详情页",
      content: {}
    });
  };

};

IOCContainer.bind(DetailPageController).toSelf().inRequestScope();