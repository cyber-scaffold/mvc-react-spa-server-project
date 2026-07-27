import os from "os";
import { injectable, inject } from "inversify";
import MiniCssExtractPlugin from "mini-css-extract-plugin";

import { IOCContainer } from "@/frameworks/react-ssr-tool-box/compilation/cores/IOCContainer";
import { CompilationConfigManager } from "@/frameworks/react-ssr-tool-box/compilation/commons/CompilationConfigManager";

import { getLocalIdent } from "@/frameworks/react-ssr-tool-box/compilation/utils/getLocalIdent";

@injectable()
export class SassLoaderConfigManager {

  constructor (
    @inject(CompilationConfigManager) private readonly $CompilationConfigManager: CompilationConfigManager
  ) { };

  /**
   * 对于node_modules中的模块而言
   * 让css-module缺省即可
   * **/
  private async getNodeModulesRules() {
    const { extractResourceDirectoryName } = this.$CompilationConfigManager.getRuntimeConfig();
    return [{
      loader: MiniCssExtractPlugin.loader,
      options: {
        emit: true,
        defaultExport: true,
        publicPath: `/${extractResourceDirectoryName}/`
      }
    }, {
      loader: "css-loader",
      options: {
        url: true,
        import: true,
        sourceMap: true,
        modules: false,
        esModule: false,
      }
    }, {
      loader: "postcss-loader",
      options: {
        postcssOptions: {
          config: true
        },
        sourceMap: true
      }
    }, {
      loader: "sass-loader",
      options: {}
    }, {
      loader: "thread-loader",
      options: {
        poolRespawn: false,
        workers: os.cpus().length > 2 ? os.cpus().length - 1 : os.cpus().length
      }
    }];
  };

  /**
   * 对于其余的项目文件
   * css-module需要开启
   * **/
  private async getProjectRules() {
    const { extractResourceDirectoryName } = this.$CompilationConfigManager.getRuntimeConfig();
    return [{
      loader: MiniCssExtractPlugin.loader,
      options: {
        emit: true,
        defaultExport: true,
        publicPath: `/${extractResourceDirectoryName}/`
      }
    }, {
      loader: "css-loader",
      options: {
        url: true,
        import: true,
        modules: {
          auto: true,
          exportOnlyLocals: false,
          localIdentName: "[file]-[local]-[chunkhash:16]"
          // getLocalIdent
        },
        esModule: false,
        sourceMap: true
      }
    }, {
      loader: "postcss-loader",
      options: {
        postcssOptions: {
          config: true
        },
        sourceMap: true
      }
    }, {
      loader: "sass-loader",
      options: {
        sourceMap: true
      }
    }, {
      loader: "thread-loader",
      options: {
        poolRespawn: false,
        workers: os.cpus().length > 2 ? os.cpus().length - 1 : os.cpus().length
      }
    }]
  };

  public async getLoaderConfig() {
    return [{
      test: /\.(scss|sass)$/,
      oneOf: [{
        include: /(node_modules)/,
        use: await this.getNodeModulesRules()
      }, {
        use: await this.getProjectRules()
      }]
    }];
  };

};

IOCContainer.bind(SassLoaderConfigManager).toSelf().inSingletonScope();