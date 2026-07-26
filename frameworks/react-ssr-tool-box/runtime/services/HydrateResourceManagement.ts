import { injectable, inject } from "inversify";

import { IOCContainer } from "@/frameworks/react-ssr-tool-box/runtime/cores/IOCContainer";
import { RuntimeMaterielResourceDatabaseManager } from "@/frameworks/react-ssr-tool-box/runtime/commons/RuntimeMaterielResourceDatabaseManager";

import type { CompileAssetsDictionaryType } from "@/frameworks/react-ssr-tool-box/public/ResourceManager.d";

export type HydrateCompileAssetsListQueryResult = CompileAssetsDictionaryType | false;

/**
 * 注水物料的资源管理器
 * **/
@injectable()
export class HydrateResourceManagement {

  constructor (
    @inject(RuntimeMaterielResourceDatabaseManager) private readonly $RuntimeMaterielResourceDatabaseManager: RuntimeMaterielResourceDatabaseManager,
  ) { }

  /**
   * 获取注水渲染时涉及到的资源
   * **/
  public async getResourceListByAlias(alias: string): Promise<HydrateCompileAssetsListQueryResult> {
    const hydrateCompileDatabase = this.$RuntimeMaterielResourceDatabaseManager.getHydrateCompileDatabase();
    await hydrateCompileDatabase.read();
    if (hydrateCompileDatabase.data["status"] !== "done") {
      // await new Promise((resolve) => setTimeout(resolve, 100));
      // return await this.getResourceListByAlias(alias);
      return false;
    };
    if (!hydrateCompileDatabase.data["assets"]) {
      return false;
    };
    if (!hydrateCompileDatabase.data["assets"][alias]) {
      return false;
    };
    const compileAssetsInfo = hydrateCompileDatabase.data["assets"][alias];
    return compileAssetsInfo;
  };

};

IOCContainer.bind(HydrateResourceManagement).toSelf().inRequestScope();
