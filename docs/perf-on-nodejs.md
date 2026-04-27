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

# mapファイルのデータとperf.data内の関数が関連づけられない問題

```
# PID 51349のスタックトレース
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
```

# 資料
- https://nodejs.org/learn/diagnostics/poor-performance/using-linux-perf
    - 導入方法