import os from "os";
import { injectable, inject } from "inversify";

import { IOCContainer } from "@/frameworks/react-ssr-tool-box/compilation/cores/IOCContainer";
import { CompilationConfigManager } from "@/frameworks/react-ssr-tool-box/compilation/commons/CompilationConfigManager";

import { filePathContentHash } from "@/frameworks/react-ssr-tool-box/compilation/utils/filePathContentHash";

import type { MaterielCompilationInfoType } from "@/frameworks/react-ssr-tool-box/compilation/commons/CompilationConfigManager";


/**
 * 这个类必须为单例模式
 * 因为当注水资源和脱水资源同时都需要构建的时候需要计算哪些资源不需要重复生成
 * **/
@injectable()
export class FileLoaderConfigManager {

  constructor (
    @inject(CompilationConfigManager) private readonly $CompilationConfigManager: CompilationConfigManager
  ) { };

  /**
   * node_modules中的静态文件也可以考虑使用url-loader
   * 所以这里单独把他拿出来处理
   * **/
  private async getNodeModulesRules() {
    const { extractResourceDirectoryName } = this.$CompilationConfigManager.getRuntimeConfig();
    return [{
      loader: "file-loader",
      options: {
        emitFile: true,
        outputPath: `../${extractResourceDirectoryName}/`,
        publicPath: `/${extractResourceDirectoryName}/`,
        name: (resourcePath: string) => {
          return `[name]-${filePathContentHash(resourcePath)}-[contenthash].[ext]`;
        }
      }
    }, {
      loader: "thread-loader",
      options: {
        poolRespawn: false,
        workers: os.cpus().length > 2 ? os.cpus().length - 1 : os.cpus().length
      }
    }];
  };

  /**
   * 需要生成静态资源的规则
   * **/
  private async getEmitResourceRules() {
    const { extractResourceDirectoryName } = this.$CompilationConfigManager.getRuntimeConfig();
    return [{
      loader: "file-loader",
      options: {
        emitFile: true,
        outputPath: `../${extractResourceDirectoryName}/`,
        publicPath: `/${extractResourceDirectoryName}/`,
        name: (resourcePath: string) => {
          return `[name]-${filePathContentHash(resourcePath)}-[contenthash].[ext]`;
        }
      }
    }, {
      loader: "thread-loader",
      options: {
        poolRespawn: false,
        workers: os.cpus().length > 2 ? os.cpus().length - 1 : os.cpus().length
      }
    }];
  };

  /**
   * 不需要生成静态资源,只要import的规则
   * **/
  private async getNotEmitResourceRules() {
    const { extractResourceDirectoryName } = this.$CompilationConfigManager.getRuntimeConfig();
    return [{
      loader: "file-loader",
      options: {
        emitFile: false,
        outputPath: `../${extractResourceDirectoryName}/`,
        publicPath: `/${extractResourceDirectoryName}/`,
        name: (resourcePath: string) => {
          return `[name]-${filePathContentHash(resourcePath)}-[contenthash].[ext]`;
        }
      }
    }, {
      loader: "thread-loader",
      options: {
        poolRespawn: false,
        workers: os.cpus().length > 2 ? os.cpus().length - 1 : os.cpus().length
      }
    }];
  };

  /**
   * 对于 脱水编译环节而言 要把 在注水编译环节生成的 静态资源排除掉
   * **/
  public async getConfigByDehydrate() {
    const { hydrateDictionary } = this.$CompilationConfigManager.getRuntimeConfig();
    const hydrateCompilationPhase: string[] = Object.values(hydrateDictionary).map((everyMaterielInfo: MaterielCompilationInfoType) => {
      return everyMaterielInfo.source;
    });
    return [{
      test: /\.(ico|png|jpg|jpeg|gif|mp3|mp4|avi|svg|ttf|eot|otf|fon|ttc|woff|woff2)$/,
      oneOf: [{
        include: /(node_modules)/,
        use: await this.getNodeModulesRules()
      }, {
        issuer: hydrateCompilationPhase,
        use: await this.getNotEmitResourceRules()
      }, {
        use: await this.getEmitResourceRules()
      }]
    }];
  };

  public async getConfigByHydrate() {
    return [{
      test: /\.(ico|png|jpg|jpeg|gif|mp3|mp4|avi|svg|ttf|eot|otf|fon|ttc|woff|woff2)$/,
      oneOf: [{
        include: /(node_modules)/,
        use: await this.getNodeModulesRules()
      }, {
        use: await this.getEmitResourceRules()
      }]
    }];
  };

};

IOCContainer.bind(FileLoaderConfigManager).toSelf().inSingletonScope();