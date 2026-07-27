import { injectable, inject } from "inversify";

import { IOCContainer } from "@/frameworks/mpx-build-tool/cores/IOCContainer";
import { FrameworkConfigManager } from "@/frameworks/mpx-build-tool/commons/FrameworkConfigManager";
import { setCompileConfiguration, makeHydrateResource, makeDehydrateResource } from "@/frameworks/react-ssr-tool-box/compilation";

import { dehydrateEntryFilePreset, hydrateEntryFilePreset } from "@/frameworks/preset-mpx-basic";

/**
 * 在构建模式下制作脱水和注水物料的控制器
 * **/
@injectable()
export class MakeMaterielResource {

  constructor (
    @inject(FrameworkConfigManager) private readonly $FrameworkConfigManager: FrameworkConfigManager
  ) { };

  public async buildMaterielResourceByDevelopmentAndWatch() {
    const { projectDirectoryPath, assetsDirectoryName, dehydrateIncludePackageList, dehydrateExcludePackageList, materiels } = await this.$FrameworkConfigManager.getRuntimeConfig();
    await setCompileConfiguration({ projectDirectoryPath, assetsDirectoryName, dehydrateIncludePackageList, dehydrateExcludePackageList, hydratePreset: hydrateEntryFilePreset, dehydratePreset: dehydrateEntryFilePreset, materiels });
    makeHydrateResource({ mode: "development", watch: true })
    makeDehydrateResource({ mode: "development", watch: true })
  };

  public async buildMaterielResourceByProductionNotWatch() {
    const { projectDirectoryPath, assetsDirectoryName, dehydrateIncludePackageList, dehydrateExcludePackageList, materiels } = await this.$FrameworkConfigManager.getRuntimeConfig();
    await setCompileConfiguration({ projectDirectoryPath, assetsDirectoryName, dehydrateIncludePackageList, dehydrateExcludePackageList, hydratePreset: hydrateEntryFilePreset, dehydratePreset: dehydrateEntryFilePreset, materiels });
    await Promise.all([
      makeHydrateResource({ mode: "production", watch: false }),
      makeDehydrateResource({ mode: "production", watch: false })
    ]);
  };

};

IOCContainer.bind(MakeMaterielResource).toSelf().inRequestScope();