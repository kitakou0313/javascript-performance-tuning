# JavaScriptコードの実行方法

JavaScriptコードを実行前にMachine Codeに変換する必要がある。

## [V8 Engine](https://github.com/v8/v8/tree/main)の場合
- JavaScript -> AST -> ByteCode -> Machine Code という流れで変換され実行される
    - JavaScript -> AST
        - parserが担当
    - AST -> ByteCode
        - IgnitionというInterpreterがByteCodeを実行する
    - ByteCode -> Machine Code
        - TurboFanというJITコンパイラが担当
        - Byte Codeのうち実行される頻度が高いものが適宜Machine Codeに変換される
        - これにより高速化が見込める
- ByteCode?
    - Machine Codeよりもシンプルな構文
    - V8内で定義されている
        - https://github.com/v8/v8/blob/main/src/interpreter/bytecodes.h
- 疑問
    - なぜ直接Machine Codeにせず間にByte Codeを挟む？
        - 前提:JavaScript -> Machine Codeに要する時間よりJavaScirpt -> ByteCodeの方が早い
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
- 課題:JavaScriptでの行数での比較と実際の実行時間の比較が一致してない
    - 少ない行数のコードが実際には2倍以上の長さのコードよりも遅いことがあった
    - 直感的ではなく、実装者の経験に依存する
- アイデア:JavaScript -> ByteCode or Machine Codeに変換して実行される行数を見ればどちらが遅いかは自明にわかる？
- テスト用のコードを作成
    - 二次元座標に対して以下の操作を行うClassを定義
        - 集合へ追加
        - 集合から削除
        - ある座標が集合に含まれるかの判定
        - 集合の元を配列にして返す
    - このClassをMap+Setで実装したもの、StringとSetで実装したものを用意し、実行時間を比較する
        - 以前検証した結果前者の方が早い
    - これらに対しての操作を複数回行うスクリプトを作成し、ByteCodeを見てみる
- 生成したByteCode
    - [MapとSetで実装したバージョン](docs/byteCode-withMapAndSet.txt)
    - [StringとSetで実装したバージョン](docs/byteCode-withString.txt)
- 結論
    - 実際にどの程度の実行時間になるかはテスト用のコードを使って検証した方がいい
        - ByteCodeなら実際に実行されるMachine Codeとほぼ同じように行数が見れるかと思ったが、あまり意味がなさそう
            - 他命令へのジャンプがあり難しかった
                - inline展開しないと行数がわからない
            - （未検証）1 ByteCode辺りの変換後のMachine codeの行数には大きなばらつきがあるので、最終的な比較にはならない
                - ByteCodeでは行数が少なくてもMachine Code変換後に行数が増加している可能性が考えられる
                - (そもそも1Machine code辺りの実行時間は全ての命令で等しいの？)
        - Machine Codeへの変換はv8 Engineの仕様上困難
            - 基本的にByteCodeを逐次Machine Codeへ変換して実行している
                - 実行までの速度を高速化するため
            - 高頻度に呼び出される関数のみMachine Codeに変換する
    - CPU以外の要因で遅くなることも考えられる
        - ロック待ちなど
    - ただ、実際のMachine Codeを見れる手段はあった方がいい
        - なぜ時間がかかるのか -> Machine Codeに変換したときに長いから という結論が得られる
        - 原理的に筋の悪い実装をしなくて済むようになる

## ByteCodeとMachine Codeと対応
- ByteCodeとMachine Codeが