import path from "path";
import WebpackBar from "webpackbar";
import { merge } from "webpack-merge";
import { injectable, inject } from "inversify";
import MiniCssExtractPlugin from "mini-css-extract-plugin";
import NodePolyfillPlugin from "node-polyfill-webpack-plugin";
import { webpack, DllReferencePlugin, SourceMapDevToolPlugin, DefinePlugin } from "webpack";

import { IOCContainer } from "@/frameworks/react-ssr-tool-box/compilation/cores/IOCContainer";
import { CompilationConfigManager } from "@/frameworks/react-ssr-tool-box/compilation/commons/CompilationConfigManager";

import { CompilationMaterielResourceDatabaseManager } from "@/frameworks/react-ssr-tool-box/compilation/commons/CompilationMaterielResourceDatabaseManager";
import { ScriptLoaderConfigManger } from "@/frameworks/react-ssr-tool-box/compilation/configs/loaders/ScriptLoaderConfigManger";
import { FileLoaderConfigManager } from "@/frameworks/react-ssr-tool-box/compilation/configs/loaders/FileLoaderConfigManager";
import { LessLoaderConfigManager } from "@/frameworks/react-ssr-tool-box/compilation/configs/loaders/LessLoaderConfigManager";
import { SassLoaderConfigManager } from "@/frameworks/react-ssr-tool-box/compilation/configs/loaders/SassLoaderConfigManager";
import { CssLoaderConfigManager } from "@/frameworks/react-ssr-tool-box/compilation/configs/loaders/CssLoaderConfigManager";

import { ConvertHydrateEntryFile } from "@/frameworks/react-ssr-tool-box/compilation/services/ConvertHydrateEntryFile";
import { CompilerProgressPlugin } from "@/frameworks/react-ssr-tool-box/compilation/plugins/CompilerProgressPlugin";

import type { PathData, Compiler, Configuration } from "webpack";

@injectable()
export class HydrateConfigManager {

  constructor (
    @inject(CompilationMaterielResourceDatabaseManager) private readonly $CompilationMaterielResourceDatabaseManager: CompilationMaterielResourceDatabaseManager,
    @inject(ConvertHydrateEntryFile) private readonly $ConvertHydrateEntryFile: ConvertHydrateEntryFile,
    @inject(ScriptLoaderConfigManger) private readonly $ScriptLoaderConfigManger: ScriptLoaderConfigManger,
    @inject(FileLoaderConfigManager) private readonly $FileLoaderConfigManager: FileLoaderConfigManager,
    @inject(LessLoaderConfigManager) private readonly $LessLoaderConfigManager: LessLoaderConfigManager,
    @inject(SassLoaderConfigManager) private readonly $SassLoaderConfigManager: SassLoaderConfigManager,
    @inject(CssLoaderConfigManager) private readonly $CssLoaderConfigManager: CssLoaderConfigManager,
    @inject(CompilationConfigManager) private readonly $CompilationConfigManager: CompilationConfigManager
  ) { };

  /**
   * 最基础的webpack编译配置
   * **/
  public async getBasicConfig(): Promise<Configuration> {
    const { projectDirectoryPath } = await this.$CompilationConfigManager.getRuntimeConfig();
    return {
      entry: this.$ConvertHydrateEntryFile.getWebpackEntryPoints(),
      resolve: {
        extensions: [".ts", ".tsx", ".js", ".jsx"],
        alias: {
          "@": projectDirectoryPath
        }
      },
      optimization: {
        nodeEnv: false
      },
      module: {
        rules: (await Promise.all([
          this.$FileLoaderConfigManager.getConfigByHydrate(),
          this.$ScriptLoaderConfigManger.getLoaderConfig(),
          this.$LessLoaderConfigManager.getLoaderConfig(),
          this.$SassLoaderConfigManager.getLoaderConfig(),
          this.$CssLoaderConfigManager.getLoaderConfig()
        ])).flat()
      },
      plugins: [
        new WebpackBar({ name: "制作注水物料" }),
        // new NodePolyfillPlugin(),
        // new DllReferencePlugin({
        //   manifest: path.resolve(assetsDirectoryPath, "./dll/hydrate.dll.json")
        // }),
        new CompilerProgressPlugin({
          type: "hydrate",
          materielResourceDatabaseManager: this.$CompilationMaterielResourceDatabaseManager
        }),
        new DefinePlugin({
          "process.env.RESOURCE_TYPE": JSON.stringify("hydrate")
        })
      ]
    };
  };

  /**
   * 开发模式下的webpack配置
   * **/
  public async getWebpackDevelopmentCompiler(): Promise<Compiler> {
    const { extractResourceDirectoryName, hydrateResourceDirectoryPath } = await this.$CompilationConfigManager.getRuntimeConfig();
    const basicConfig: Configuration = await this.getBasicConfig();
    const webpackCompiler = webpack(merge<Configuration>(basicConfig, {
      mode: "development",
      devtool: "source-map",
      output: {
        clean: true,
        path: hydrateResourceDirectoryPath,
        devtoolModuleFilenameTemplate: "[absolute-resource-path]",
        filename: (pathData: PathData) => `index-${pathData.chunk.name}-hydrate.js`,
        library: {
          type: "window",
          export: "default",
          name: "hydrateBootstrap"
        },
      },
      plugins: [
        new MiniCssExtractPlugin({
          linkType: "text/css",
          filename: (pathData: PathData) => `../${extractResourceDirectoryName}/index-${pathData.chunk.name}-hydrate.css`
        })
      ]
    }));
    await this.$ConvertHydrateEntryFile.mountWithWebpackCompiler(webpackCompiler);
    return webpackCompiler;
  };

  /**
   * 生产模式下的webpack配置
   * **/
  public async getWebpackProductionCompiler(): Promise<Compiler> {
    const { extractResourceDirectoryName, hydrateResourceDirectoryPath } = await this.$CompilationConfigManager.getRuntimeConfig();
    const basicConfig: Configuration = await this.getBasicConfig();
    const webpackCompiler = webpack(merge<Configuration>(basicConfig, {
      mode: "none",
      devtool: false,
      output: {
        clean: true,
        path: hydrateResourceDirectoryPath,
        devtoolModuleFilenameTemplate: "[absolute-resource-path]",
        filename: (pathData: PathData) => `index-${pathData.chunk.name}-hydrate-[contenthash].js`,
        library: {
          type: "window",
          export: "default",
          name: "hydrateBootstrap"
        },
      },
      plugins: [
        new MiniCssExtractPlugin({
          linkType: "text/css",
          filename: (pathData: PathData) => `../${extractResourceDirectoryName}/index-${pathData.chunk.name}-hydrate-[contenthash].css`
        }),
        new SourceMapDevToolPlugin({
          test: /\.(js|css|less|scss|sass)($|\?)/i,
          filename: `../prod-source-maps/[base].map`, // 这里的 [file] 是指原文件名（如 main.js 或 main.css）
          // append: "\n//# sourceMappingURL=http://your-server.com/maps/[url]"
          // append为false的时候等价于hidden-source-map
          append: false
        })
      ]
    }));
    await this.$ConvertHydrateEntryFile.mountWithWebpackCompiler(webpackCompiler);
    return webpackCompiler;
  };

};

IOCContainer.bind(HydrateConfigManager).toSelf().inRequestScope();