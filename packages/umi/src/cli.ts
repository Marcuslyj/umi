import { chalk, yParser } from '@umijs/utils';
import { existsSync } from 'fs';
import { join } from 'path';
import initWebpack from './initWebpack';
import { Service } from './ServiceWithBuiltIn';
import fork from './utils/fork';
import getCwd from './utils/getCwd';
import getPkg from './utils/getPkg';

const v = process.version;

if (v && parseInt(v.slice(1)) < 10) {
  console.log(
    chalk.red(
      `Your node ${v} is not supported by umi, please upgrade to 10 or above.`,
    ),
  );
  process.exit(1);
}

// 举例说明
// umi dev
// args { 
//   _: [ 'dev' ] 
// }
// 
// umi -version
// args {
//   _: [],
//   v: true,
//   version: true
// }
// 命令行参数处理完毕后，对 version 和 help 进行特殊处理。
// 如果 args 中有 version 字段，并且 args._ 中没有值，那么认为 args.[0] = 'version'，并且从 package.json 中获得 version 的值，然后打印。
// 如果没有 version 字段，args._ 中也没有值，认为要执行 help 命令。

// process.argv: [node, umi.js, command, args]
const args = yParser(process.argv.slice(2), {
  alias: {
    version: ['v'],
    help: ['h'],
  },
  boolean: ['version'],
});

if (args.version && !args._[0]) {
  args._[0] = 'version';
  const local = existsSync(join(__dirname, '../.local'))
    ? chalk.cyan('@local')
    : '';
  console.log(`umi@${require('../package.json').version}${local}`);
} else if (!args._[0]) {
  args._[0] = 'help';
}

// allow parent framework to modify the title
if (process.title === 'node') {
  process.title = 'umi';
}

// 最后是一段自执行的同步方法。处理 dev 和 build 这两种情况。dev包含build逻辑
(async () => {
  try {
    switch (args._[0]) {
      case 'dev':
        const child = fork({
          scriptPath: require.resolve('./forkedDev'),
        });
        // ref:
        // http://nodejs.cn/api/process/signal_events.html
        // https://lisk.io/blog/development/why-we-stopped-using-npm-start-child-processes
        // dev 环境下事件监听
        // 发送 SIGINT、 SIGTERM 和 SIGKILL 会导致目标进程被无条件地终止
        // 然后子进程会报告该进程已被信号终止
        // 'SIGINT' 在终端运行时，可以被所有平台支持，通常可以通过 <Ctrl>+C 触发
        process.on('SIGINT', () => {
          child.kill('SIGINT');
          // ref:
          // https://github.com/umijs/umi/issues/6009
          process.exit(0);
        });
        process.on('SIGTERM', () => {
          child.kill('SIGTERM');
          process.exit(1);
        });
        break;
      default:
        const name = args._[0];
        if (name === 'build') {
          process.env.NODE_ENV = 'production';
        }

        // Init webpack version determination and require hook for build command
        initWebpack();

        await new Service({
          cwd: getCwd(),
          pkg: getPkg(process.cwd()),
        }).run({
          name,
          args,
        });
        break;
    }
  } catch (e) {
    console.error(chalk.red(e.message));
    console.error(e.stack);
    process.exit(1);
  }
})();


// umi 的命令执行流程如下：

// 参数规范化。
// 处理 version 和 help 命令。
// 启动新的 nodejs 进程，处理子进程和主进程通讯，用于停止子进程。
// 构造 Service 对象，传入了一个 presets 和 一个 plugin， 执行该对象 run 方法。
// 不论是调用 start 还是 build 方法，最终的目的都是生成一个 service 对象，
// service 对象是 umi 的核心对象，用于实现 umi 的插件机制，由于 Service 对象比较复杂，下一章单独讲。