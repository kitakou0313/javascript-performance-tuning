# Node.jsでのperfの利用

`--perf-basic-prof`または`--perf-basic-prof-only-functions`でperf_eventsを有効化した状態で実行できる
```
$ perf record -F 99 -g -- node --perf-basic-prof build/sampleWithString.js
# /tmp以下にmapファイルが生成される これが実際のコードとの対応表になっている（JIT Symbol）
$ ls -la /tmp
-rw-r--r--  1 root   root   172648 Apr 26 22:12 perf-18054.map
$ cat /tmp/perf-18054.map  | head -n 10
e320d926b000 314 Builtin:DeoptimizationEntry_Eager
e320d926b320 314 Builtin:DeoptimizationEntry_Lazy
e320d926b640 7b4 Builtin:RecordWriteSaveFP
e320d926be00 514 Builtin:RecordWriteIgnoreFP
e320d926c320 10c Builtin:EphemeronKeyBarrierSaveFP
e320d926c440 ac Builtin:EphemeronKeyBarrierIgnoreFP
e320d926c500 4c Builtin:AdaptorWithBuiltinExitFrame
e320d926c560 28 Builtin:IndirectPointerBarrierSaveFP
e320d926c5a0 28 Builtin:IndirectPointerBarrierIgnoreFP
e320d926c5e0 150 Builtin:CallFunction_ReceiverIsNullOrUndefined
```

# mapファイルのデータとperf.data内の関数が100%関連づけられない問題

一部16進数表記になってしまう
```
# PID 51349のスタックトレース
# perf scriptコマンドでPIDが見れる
$ perf script | head -20
node   51349  1885.063562:   10101010 task-clock:ppp: 
            e713563269e8 [unknown] (/usr/lib/aarch64-linux-gnu/ld-linux-aarch64.so.1)
            e7135632ac84 [unknown] (/usr/lib/aarch64-linux-gnu/ld-linux-aarch64.so.1)
            e7135632bfa8 [unknown] (/usr/lib/aarch64-linux-gnu/ld-linux-aarch64.so.1)
            e71356336ff8 [unknown] (/usr/lib/aarch64-linux-gnu/ld-linux-aarch64.so.1)
            e713563342cc [unknown] (/usr/lib/aarch64-linux-gnu/ld-linux-aarch64.so.1)
            e7135633564c [unknown] (/usr/lib/aarch64-linux-gnu/ld-linux-aarch64.so.1)
            e71356339654 [unknown] (/usr/lib/aarch64-linux-gnu/ld-linux-aarch64.so.1)

node   51349  1885.132092:   10101010 task-clock:ppp: 
            e7135395f180 v8::internal::VariableMap::Lookup(v8::internal::AstRawString const*)+0x40 (/usr/lib/aarch64-linux-gnu/libnode.so.127)
            e713539614db v8::internal::Scope::ResolvePreparsedVariable(v8::internal::VariableProxy*, v8::internal::Scope*, v8::internal::Scope*)+0x3b (/usr/lib/aarch64-linux-gnu/libnode.so.127)
# 対応する16進数の行がない
$ cat /tmp/perf-51349.map | grep  e7135395f180
$ echo $?
1

# 実行したスクリプトについては存在する
$ cat /tmp/perf-21107.map | grep javascript
2b0b7f0a3a0 120 Script:~ file:///home/ubuntu/javascript-performance-tuning/build/sampleWithString.js:1:1
2b0b7f0caf8 72 Script:~ file:///home/ubuntu/javascript-performance-tuning/build/libs/setWithString.js:1:1
2b0b7f0cbf0 f JS:~CoorinateSetWithString file:///home/ubuntu/javascript-performance-tuning/build/libs/setWithString.js:1:37
2b0b7f0ce00 10 JS:~CoorinateSetWithString file:///home/ubuntu/javascript-performance-tuning/build/libs/setWithString.js:1:8
2b0b7f0d3e0 1d JS:~add file:///home/ubuntu/javascript-performance-tuning/build/libs/setWithString.js:13:8
2b0b7f0d480 11 JS:~convertCoordinateToString file:///home/ubuntu/javascript-performance-tuning/build/libs/setWithString.js:3:30
e39f567d20e0 908 JS:^ file:///home/ubuntu/javascript-performance-tuning/build/sampleWithString.js:1:1
e39f567d3880 90 JS:^convertCoordinateToString file:///home/ubuntu/javascript-performance-tuning/build/libs/setWithString.js:3:30
e39f567d3940 e8 JS:^add file:///home/ubuntu/javascript-performance-tuning/build/libs/setWithString.js:13:8
e39f567d3a60 1f4 JS:*add file:///home/ubuntu/javascript-performance-tuning/build/libs/setWithString.js:13:8
e39f567d3ca0 174 JS:*convertCoordinateToString file:///home/ubuntu/javascript-performance-tuning/build/libs/setWithString.js:3:30

$ 
|--14.47%--JS:^ file:///home/ubuntu/javascript-performance-tuning/build/sampleWithString.j>
                                     |          |          
                                     |           --13.99%--JS:*listAllCoordinates file:///home/ubuntu/javascript-performance-tu>
                                     |                     |          
                                     |                     |--8.81%--0xe25dd2d3afe0
                                     |                     |          |          
                                     |                     |           --8.65%--0xe25dd2d4d9d4
                                     |                     |                     v8::internal::Runtime_StringSplit(int, unsigne>
                                     |                     |                     |          
                                     |                     |                     |--2.36%--v8::internal::Factory::NewJSArray(v8>
                                     |                     |                     |          |          
                                     |                     |                     |          |--0.94%--v8::internal::Factory::Ne>
                                     |                     |                     |          |          v8::internal::Factory::N>
                                     |                     |                     |          |          
                                     |                     |                     |           --0.79%--v8::internal::Factory::Ne>
                                     |                     |                     |          
                                     |                     |                     |--1.57%--v8::internal::Factory::NewCopiedSubs>
                                     |                     |                     |          
                                     |                     |                     |--1.42%--v8::internal::FindStringIndicesDispa>
                                     |                     |                     |          |          
                                     |                     |                     |           --1.26%--v8::internal::FindOneByte>
                                     |                     |                     |          
                                     |                     |                      --0.79%--v8::internal::FactoryBase<v8::intern>
                                     |                     |                                v8::internal::FactoryBase<v8::inter>
                                     |                     |                                v8::internal::Handle<v8::internal::>
                                     |                     |          
                                     |                      --3.93%--0xe25dd2d4d9d4
                                     |                                |          
                                     |                                 --3.62%--v8::internal::Runtime_StringParseInt(int, unsig>
                                     |                                           |          
                                     |                                            --2.99%--v8::internal::StringToInt(v8::intern>
                                     |                                                      |          
                                     |                                                       --2.67%--v8::internal::StringToInt>
```

## 原因調査
### 仮説1:再コンパイルによるメモリアドレスの変化 -> --no-optオプションで解消する？
- V8 Engineでは2段階の変換が行われる
    - ソースコード -> ByteCode -> 機械語
- 通常はByteCodeをVMが実行時に機械語に都度変換して実行する
- しかし、頻繁に実行される関数については途中で機械語への変換結果を保持しておき使い回すことで高速化する
    - TurboFanという仕組み
- この再コンパイルの時にメモリ上のアドレスが変化するため、.mapファイルの内容と統一されなくなったと考えられる
    - ->でもそれは新しくエントリを足せばいいだけでは？

```
# --no-opt無しだと倍近く実行時間が違う -> 本番アプリケーションとは条件が違いすぎるため参考にならない
$ sudo perf record -F 99 -g -- node --perf-basic-prof --no-opt  build/sampleWithString.js
add: 8.232s
has: 8.360s
listAllCoordinates: 2.767s
[ perf record: Woken up 3 times to write data ]
[ perf record: Captured and wrote 0.629 MB perf.data (1904 samples) ]

#　解消しなかった + 解析に使われているサンプル数が少ない(4)
# To display the perf.data header info, please use --header/--header-only options.
#
#
# Total Lost Samples: 0
#
# Samples: 4  of event 'task-clock:ppp'
# Event count (approx.): 40404040
#
# Children      Self  Command  Shared Object          Symbol                                                                          >
# ........  ........  .......  .....................  ................................................................................>
#
    75.00%     0.00%  node     node                   [.] _start
            |
            ---_start
               __libc_start_main_impl (inlined)
               call_init (inlined)
               0xf5f01a982f1c
               node::Start(int, char**)
               |          
               |--50.00%--node::NodeMainInstance::Run()
               |          node::NodeMainInstance::CreateMainEnvironment(node::ExitCode*)
               |          node::CreateEnvironment(node::IsolateData*, v8::Local<v8::Context>, std::vector<std::__cxx11::basic_string<c>
               |          node::CreateEnvironment(node::IsolateData*, v8::Local<v8::Context>, std::vector<std::__cxx11::basic_string<c>
               |          node::Realm::RunBootstrapping()
               |          node::PrincipalRealm::BootstrapRealm()
               |          node::Realm::ExecuteBootstrapper(char const*)
               |          node::builtins::BuiltinLoader::CompileAndCall(v8::Local<v8::Context>, char const*, node::Realm*)
               |          v8::Object::CallAsFunction(v8::Local<v8::Context>, v8::Local<v8::Value>, int, v8::Local<v8::Value>*)
               |          v8::internal::Execution::Call(v8::internal::Isolate*, v8::internal::Handle<v8::internal::Object>, v8::intern>
               |          0xf5f01c048cd0
               |          0xf5f01bd058f4
               |          0xf5f01bd05c0c
               |          0xf5f01bd07ef0
```

### 仮説2:perfコマンドとnodeコマンドを別々に実行しないといけない可能性
各種サンプルを見ると別々に実行している　これには理由があるのでは？（実行中のwebアプリケーションに対するパフォーマンス調査を意図しているのかもしれないが）

```
# 以下を別々に実行してみる
$ sudo perf record -F 99 -p `pgrep -n node` -g -- sleep 15
$ node --perf-basic-prof build/sampleWithString.js

# 変化なし
|--18.22%--JS:^ file:///home/ubuntu/javascript-performance-tuning/build/sampleWithString.js:1:1
               |          |          
               |           --17.82%--JS:*listAllCoordinates file:///home/ubuntu/javascript-performance-tuning/build/libs/setWit>
               |                     |          
               |                     |--9.90%--0xe500fb3aafe0
               |                     |          0xe500fb3bd9d4
               |                     |          |          
               |                     |           --9.50%--v8::internal::Runtime_StringSplit(int, unsigned long*, v8::internal::>
               |                     |                     |          
               |                     |                     |--2.77%--v8::internal::Factory::NewJSArray(v8::internal::ElementsKi>
               |                     |                     |          |          
               |                     |                     |           --1.78%--v8::internal::Factory::NewJSArrayWithUnverified>
               |                     |                     |                     v8::internal::Factory::NewJSObjectFromMap(v8::>
               |                     |                     |                     |          
               |                     |                     |                      --0.99%--v8::internal::Factory::InitializeJSO>
               |                     |                     |          
               |                     |                     |--2.38%--v8::internal::Factory::NewCopiedSubstring(v8::internal::Ha>
               |                     |                     |          |          
               |                     |                     |          |--0.79%--void v8::internal::String::WriteToFlat<unsigned>
               |                     |                     |          |          
               |                     |                     |           --0.59%--v8::internal::FactoryBase<v8::internal::Factory>
               |                     |                     |          
               |                     |                     |--1.58%--v8::internal::FindStringIndicesDispatch(v8::internal::Isol>
               |                     |                     |          |          
               |                     |                     |           --1.19%--v8::internal::FindOneByteStringIndices(v8::base>
               |                     |                     |          
               |                     |                      --0.59%--v8::internal::FactoryBase<v8::internal::Factory>::MakeOrFi>
               |                     |                                v8::internal::FactoryBase<v8::internal::Factory>::Interna>
               |                     |                                v8::internal::Handle<v8::internal::String> v8::internal::>
            
```


# 資料
- https://nodejs.org/learn/diagnostics/poor-performance/using-linux-perf
    - 導入方法