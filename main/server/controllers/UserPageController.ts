import { Router } from "express";
import { injectable, inject } from "inversify";

import { IOCContainer } from "@/main/server/cores/IOCContainer";
import { ServerSiderRenderService } from "@/main/server/services/ServerSiderRenderService";
import { responseHtmlWrapper } from "@/main/server/utils/responseHtmlWrapper";

import type { Request } from "express";

@injectable()
export class UserPageController {

  constructor (
    @inject(ServerSiderRenderService) private readonly $ServerSiderRenderService: ServerSiderRenderService
  ) { };

  /** 注册路由的方法 **/
  public getRouter() {
    return Router().get("/user", responseHtmlWrapper(async (request: Request) => {
      return await this.execute(request);
    }));
  };

  /** 路由的业务逻辑 **/
  public async execute(request: Request): Promise<string> {
    return await this.$ServerSiderRenderService.render({
      request,
      alias: "UserPage",
      title: "用户中心",
      keywords: [],
      description: "",
      content: {}
    });
  };

};

IOCContainer.bind(UserPageController).toSelf().inRequestScope();