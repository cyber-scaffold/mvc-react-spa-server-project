import { injectable, inject } from "inversify";

import { IOCContainer } from "@/frameworks/react-ssr-tool-box/runtime/cores/IOCContainer";
import { RuntimeMaterielResourceDatabaseManager } from "@/frameworks/react-ssr-tool-box/runtime/commons/RuntimeMaterielResourceDatabaseManager";

import type { CompileAssetsDictionaryType } from "@/frameworks/react-ssr-tool-box/public/ResourceManager.d";

export type DehydrateCompileAssetsListQueryResult = CompileAssetsDictionaryType | false;

/**
 * 脱水物料的资源管理器
 * **/
@injectable()
export class DehydrateResourceManagement {

  constructor (
    @inject(RuntimeMaterielResourceDatabaseManager) private readonly $RuntimeMaterielResourceDatabaseManager: RuntimeMaterielResourceDatabaseManager,
  ) { }

  /**
   * 获取脱水渲染时涉及到的资源
   * **/
  public async getResourceListByAlias(alias: string): Promise<DehydrateCompileAssetsListQueryResult> {
    const dehydrateCompileDatabase = this.$RuntimeMaterielResourceDatabaseManager.getDehydrateCompileDatabase();
    await dehydrateCompileDatabase.read();
    if (dehydrateCompileDatabase.data["status"] !== "done") {
      // await new Promise((resolve) => setTimeout(resolve, 100));
      // return await this.getResourceListByAlias(alias);
      return false;
    };
    if (!dehydrateCompileDatabase.data["assets"]) {
      return false;
    };
    if (!dehydrateCompileDatabase.data["assets"][alias]) {
      return false;
    };
    const compileAssetsInfo = dehydrateCompileDatabase.data["assets"][alias];
    return compileAssetsInfo;
  };

};

IOCContainer.bind(DehydrateResourceManagement).toSelf().inRequestScope();
