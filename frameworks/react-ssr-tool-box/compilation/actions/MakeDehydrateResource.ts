import Queue from "queue";
import pathExists from "path-exists";
import { injectable, inject } from "inversify";

import { IOCContainer } from "@/frameworks/react-ssr-tool-box/compilation/cores/IOCContainer";
import { CompilationConfigManager } from "@/frameworks/react-ssr-tool-box/compilation/commons/CompilationConfigManager";
import { ConvertDehydrateEntryFile } from "@/frameworks/react-ssr-tool-box/compilation/services/ConvertDehydrateEntryFile";
import { DehydrateConfigManager } from "@/frameworks/react-ssr-tool-box/compilation/configs/webpack/DehydrateConfigManager";
import { CompilationMaterielResourceDatabaseManager } from "@/frameworks/react-ssr-tool-box/compilation/commons/CompilationMaterielResourceDatabaseManager";

import { filterWebpackStats } from "@/frameworks/react-ssr-tool-box/compilation/utils/filterWebpackStats";

import type { Compiler } from "webpack";
import type { MaterielCompilationInfoType } from "@/frameworks/react-ssr-tool-box/compilation/commons/CompilationConfigManager";

/**
 * 脱水资源的资源管理器
 * 如果源代码发生改变,并且不是开发模式的情况下,获取脱水资源的时候就要重新编译
 * **/
@injectable()
export class MakeDehydrateResource {

  private webpackQueue = new Queue({ concurrency: 1, autostart: true });

  constructor (
    @inject(CompilationMaterielResourceDatabaseManager) private readonly $CompilationMaterielResourceDatabaseManager: CompilationMaterielResourceDatabaseManager,
    @inject(ConvertDehydrateEntryFile) private readonly $ConvertDehydrateEntryFile: ConvertDehydrateEntryFile,
    @inject(CompilationConfigManager) private readonly $CompilationConfigManager: CompilationConfigManager,
    @inject(DehydrateConfigManager) private readonly $DehydrateConfigManager: DehydrateConfigManager
  ) { }

  /**
   * 检查物料对应的源文件是否存在
   * 并转换成webpack可以识别的内容清单
   * **/
  public async checkSourceCodeAndTransformer() {
    const { dehydrateDictionary } = this.$CompilationConfigManager.getRuntimeConfig();
    /** 根据 dehydrateDictionary 来计算需要编译的注水物料 **/
    const materielPairs: [alias: string, detail: MaterielCompilationInfoType][] = await Promise.all(Object.values(dehydrateDictionary).map(async (everyMaterielInfo) => {
      if (!await pathExists(everyMaterielInfo.source)) {
        throw new Error(`source code file ${everyMaterielInfo.alias} ==> ${everyMaterielInfo.source} not exist`);
      };
      return [everyMaterielInfo.alias, everyMaterielInfo];
    }));
    await this.$ConvertDehydrateEntryFile.initialize(materielPairs);
  };

  /**
   * 在watch模式下进行物料制作
   * **/
  public async makeResourceWithWatchMode() {
    /** 获取脱水物料的编译结果的管理数据库 **/
    const dehydrateCompileDatabase = this.$CompilationMaterielResourceDatabaseManager.getDehydrateCompileDatabase();
    await dehydrateCompileDatabase.write();
    /** 获取开发环境下的编译对象 **/
    const webpackCompiler: Compiler = await this.$DehydrateConfigManager.getWebpackDevelopmentCompiler();
    webpackCompiler.watch({}, (error, stats) => {
      if (error) {
        console.log(error);
      } else {
        // console.log(stats.toString({ colors: true }));
        const latestAssetsFileList = JSON.parse(JSON.stringify(filterWebpackStats(stats.toJson({ all: false, assets: true, source: false, outputPath: true }))));
        return this.webpackQueue.push(async () => {
          /** 在json数据库中保存资源信息 **/
          dehydrateCompileDatabase.data["assets"] = latestAssetsFileList;
          await dehydrateCompileDatabase.write();
        });
      };
    });
  };

  /**
   * 在build模式下进行物料制作
   * **/
  public async makeResourceWithBuildMode() {
    /** 获取脱水物料的编译结果的管理数据库 **/
    const dehydrateCompileDatabase = this.$CompilationMaterielResourceDatabaseManager.getDehydrateCompileDatabase();
    await dehydrateCompileDatabase.write();
    /** 获取开发环境下的编译对象 **/
    const webpackCompiler: Compiler = await this.$DehydrateConfigManager.getWebpackProductionCompiler();
    webpackCompiler.run(async (error, stats) => {
      if (error) {
        console.log(error);
      } else {
        // console.log(stats.toString({ colors: true }));
        const latestAssetsFileList = filterWebpackStats(stats.toJson({ all: false, assets: true, source: false, outputPath: true }));
        /** 在json数据库中保存资源信息 **/
        dehydrateCompileDatabase.data["assets"] = latestAssetsFileList;
        await dehydrateCompileDatabase.write();
      };
    });
  };

};

IOCContainer.bind(MakeDehydrateResource).toSelf().inRequestScope();
