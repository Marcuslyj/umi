import { chalk, yParser } from '@umijs/utils';
import initWebpack from './initWebpack';
import { Service } from './ServiceWithBuiltIn';
import getCwd from './utils/getCwd';
import getPkg from './utils/getPkg';

const args = yParser(process.argv.slice(2));

(async () => {
  try {
    // 指定 NODE_ENV 为 development
    process.env.NODE_ENV = 'development';
    // Init webpack version determination and require hook
    initWebpack();

    // 核心代码，umi build 时候执行的也是这段代码
    const service = new Service({
      // getCwd 调用了 process.cwd() 方法，也就是执行 umi 命令的地址，也就是 umi 项目的根路径。
      cwd: getCwd(),
      // getPkg 是获得项目的 package.json 文件的路径。
      pkg: getPkg(process.cwd()),
    });
    await service.run({
      name: 'dev',
      args,
    });

    let closed = false;
    // kill(2) Ctrl-C
    process.once('SIGINT', () => onSignal('SIGINT'));
    // kill(3) Ctrl-\
    process.once('SIGQUIT', () => onSignal('SIGQUIT'));
    // kill(15) default
    process.once('SIGTERM', () => onSignal('SIGTERM'));

    function onSignal(signal: string) {
      if (closed) return;
      closed = true;

      // 退出时触发插件中的onExit事件
      service.applyPlugins({
        key: 'onExit',
        type: service.ApplyPluginsType.event,
        args: {
          signal,
        },
      });
      process.exit(0);
    }
  } catch (e) {
    console.error(chalk.red(e.message));
    console.error(e.stack);
    process.exit(1);
  }
})();
