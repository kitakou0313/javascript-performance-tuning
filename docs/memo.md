# JavaScriptコードの実行方法

JavaScriptコードを実行前にMachine Codeに変換する必要がある。

## V8 Engineの場合
- JavaScript -> AST -> ByteCode -> Machine Code という流れで変換され実行される
    - JavaScript -> AST
        - parserが担当
    - AST -> ByteCode
        - IgnitionがByteCodeを実行する
    - ByteCode -> Machine Code
        - TurboFanというJITコンパイラが担当
        - Byte Codeのうち実行される頻度が高いものが適宜Machine Codeに変換される
        - これにより高速化が見込める
- ByteCode?
    - Machine Codeよりもシンプルな構文
    - V8内で定義されている
- 疑問
    - なぜ直接Machine Codeにせず間にByte Codeを挟む？
        - 前提:JavaScript -> Machine Codeに要する時間よりJavaScirpt -> Machine Codeが早い
        - ブラウザの場合
            - コードがユーザーのブラウザに送られてから毎回machine codeに変換していると時間がかかりすぎる
        - サーバーサイドの場合
            - この問題を解決したBunなどがある

# 変換後のコードを見る方法
## ByteCode
```
node --print-bytecode your_script.js

# 特定の関数に絞ることも可能
node --print-bytecode --print-bytecode-filter="add" your_script.js
```

## Machine Code
```
node --print-opt-code your_script.js

# Show which functions are optimized(最適化された)
node --trace-opt your_script.js

# Show when functions are deoptimized(最適化が解除された)
node --trace-deopt your_script.js

# perfで見る方法
## Step 1: Run Node.js with perf support
perf record -g node --perf-basic-prof your_script.js

## Step 2: See the assembly(アセンブリ) output
perf report
```

## 今回の検証
