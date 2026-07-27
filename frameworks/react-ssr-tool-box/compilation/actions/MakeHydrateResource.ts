import Queue from "queue";
import pathExists from "path-exists";
import { injectable, inject } from "inversify";

import { IOCContainer } from "@/frameworks/react-ssr-tool-box/compilation/cores/IOCContainer";
import { CompilationConfigManager } from "@/frameworks/react-ssr-tool-box/compilation/commons/CompilationConfigManager";
import { ConvertHydrateEntryFile } from "@/frameworks/react-ssr-tool-box/compilation/services/ConvertHydrateEntryFile";
import { HydrateConfigManager } from "@/frameworks/react-ssr-tool-box/compilation/configs/webpack/HydrateConfigManager";
import { CompilationMaterielResourceDatabaseManager } from "@/frameworks/react-ssr-tool-box/compilation/commons/CompilationMaterielResourceDatabaseManager";

import { filterWebpackStats } from "@/frameworks/react-ssr-tool-box/compilation/utils/filterWebpackStats";

import type { Compiler } from "webpack";
import type { MaterielCompilationInfoType } from "@/frameworks/react-ssr-tool-box/compilation/commons/CompilationConfigManager";

/**
 * 水合化资源的资源管理器
 * 如果源代码发生改变,并且不是开发模式的情况下,获取水合化资源的时候就要重新编译
 * **/
@injectable()
export class MakeHydrateResource {

  private webpackQueue = new Queue({ concurrency: 1, autostart: true });

  constructor (
    @inject(CompilationMaterielResourceDatabaseManager) private readonly $CompilationMaterielResourceDatabaseManager: CompilationMaterielResourceDatabaseManager,
    @inject(ConvertHydrateEntryFile) private readonly $ConvertHydrateEntryFile: ConvertHydrateEntryFile,
    @inject(CompilationConfigManager) private readonly $CompilationConfigManager: CompilationConfigManager,
    @inject(HydrateConfigManager) private readonly $HydrateConfigManager: HydrateConfigManager
  ) { }

  /**
   * 检查物料对应的源文件是否存在
   * 并转换成webpack可以识别的内容清单
   * **/
  public async checkSourceCodeAndTransformer() {
    const { hydrateDictionary } = this.$CompilationConfigManager.getRuntimeConfig();
    /** 根据 hydrateDictionary 来计算需要编译的注水物料 **/
    const materielPairs: [alias: string, detail: MaterielCompilationInfoType][] = await Promise.all(Object.values(hydrateDictionary).map(async (everyMaterielInfo) => {
      if (!await pathExists(everyMaterielInfo.source)) {
        throw new Error(`source code file ${everyMaterielInfo.alias} ==> ${everyMaterielInfo.source} not exist`);
      };
      return [everyMaterielInfo.alias, everyMaterielInfo];
    }));
    await this.$ConvertHydrateEntryFile.initialize(materielPairs);
  };

  /**
   * 在watch模式下进行物料制作
   * **/
  public async makeResourceWithWatchMode(): Promise<void | boolean> {
    /** 获取注水物料的编译结果的管理数据库 **/
    const hydrateCompileDatabase = this.$CompilationMaterielResourceDatabaseManager.getHydrateCompileDatabase();
    await hydrateCompileDatabase.write();
    /** 生成编译对象 **/
    const webpackCompiler: Compiler = await this.$HydrateConfigManager.getWebpackDevelopmentCompiler();
    /** 开启一个编译对象 **/
    webpackCompiler.watch({}, (error, stats) => {
      if (error) {
        console.log(error);
      } else {
        if (stats.hasErrors()) {
          console.log(stats.toString({ colors: true }));
        };
        const latestAssetsFileList = JSON.parse(JSON.stringify(filterWebpackStats(stats.toJson({ all: false, assets: true, source: false, outputPath: true }))));
        return this.webpackQueue.push(async () => {
          /** 在json数据库中保存资源信息 **/
          hydrateCompileDatabase.data["assets"] = latestAssetsFileList;
          await hydrateCompileDatabase.write();
        });
      };
    });
  };

  /**
   * 在build模式下进行物料制作
   * **/
  public async makeResourceWithBuildMode(): Promise<void | boolean> {
    const hydrateCompileDatabase = this.$CompilationMaterielResourceDatabaseManager.getHydrateCompileDatabase();
    await hydrateCompileDatabase.write();
    /** 生成编译对象 **/
    const webpackCompiler: Compiler = await this.$HydrateConfigManager.getWebpackProductionCompiler();
    /** 执行编译并记录结果 **/
    webpackCompiler.run(async (error, stats) => {
      if (error) {
        console.log(error);
      } else {
        console.log(stats.toString({ colors: true }));
        const latestAssetsFileList = filterWebpackStats(stats.toJson({ all: false, assets: true, source: false, outputPath: true }));
        /** 在json数据库中保存资源信息 **/
        hydrateCompileDatabase.data["assets"] = latestAssetsFileList;
        await hydrateCompileDatabase.write();
      };
    });
  };

};

IOCContainer.bind(MakeHydrateResource).toSelf().inRequestScope();
