# Symbolについて

## 疑問
- objectファイルって何 -> Done
- アドレスはどう決まるの？
    - メモリ上のアドレスではないはず（実行のタイミングごとに変わるため）
    - perfコマンドはどうやって辿っている？
- 自分でソースコード -> Objectファイル のコンパイルを行い、中身を見てみる
- 実行可能ファイルの実行時、どのように配置され仮想アドレスが決まるか確認する
- 最終的なバイナリにはどう格納されている？
- objectファイルについてだけ述べられているが、他の言語ではどう？
    - Go（最終的にバイナリとして実行される）
    - Python
    - Java（VMがJITコンパイルして実行する）

## 定義
objectファイル上のアドレスとそのアドレスに保存されている処理に対応するソースコード上の関数名の対応表

### Objectファイルとは

#### 定義
ソースコードから実行ファイルを生成する際に生成される中間成果物。
```
source.c  →  [compiler]  →  source.o  →  [linker]  →  program
```
ソースコードを機械語に変換したものなどを含んでいる。

Objectファイルのうちそのファイル自体に含まれない処理（共有ライブラリが持つものなど）をlinkerが一つにして最終的な実行可能ファイルが生成される

#### 形式
[ELFフォーマット（Executabe and Linkable Formad）](https://ja.wikipedia.org/wiki/Executable_and_Linkable_Format)で作成されている

```
┌─────────────────────┐
│   ELF Header        │  ← file type, architecture(アーキテクチャ), etc.
├─────────────────────┤
│   .text             │  ← compiled machine code(機械語)
├─────────────────────┤
│   .data             │  ← initialized(初期化された) global variables(グローバル変数)
├─────────────────────┤
│   .bss              │  ← uninitialized(未初期化の) global variables
├─────────────────────┤
│   .rodata           │  ← read-only(読み取り専用) data (e.g. string literals(文字列リテラル))
├─────────────────────┤
│   .symtab           │  ← symbol table(シンボルテーブル)
├─────────────────────┤
│   .rel.text         │  ← relocation(再配置) entries
├─────────────────────┤
│   .debug_*          │  ← debug info (only with -g flag)
└─────────────────────┘
```

解説
- https://docs.oracle.com/cd/E19683-01/816-1386/6m7qcoblj/index.html
- https://www.cs.yale.edu/homes/aspnes/pinewiki/attachments/ELF(20)format/ELF_format.pdf

##### 中身の確認

objectファイルの場合
```
> nm main.o 
0000000000000000 T _main
                 U _printf
                 U _sum
0000000000000068 s l_.str
0000000000000077 s l_.str.1
0000000000000000 t ltmp0
0000000000000068 s ltmp1
0000000000000088 s ltmp2

> nm calc.o
0000000000000000 T _sum
0000000000000000 t ltmp0
0000000000000028 s ltmp1
```

アルファベットは以下の意味
T — function in the code section(コードセクション)
U — undefined, needs to be linked(リンクされる)
D — global variable(グローバル変数) in data section(データセクション)

実行可能ファイルの場合
```
> nm a.out 
0000000100000000 T __mh_execute_header
0000000100003ee4 T _main
                 U _printf
0000000100003f4c T _sum
```



#### 何の問題を解決するために存在するファイル？
コンパイルの回数を減らし、コードの再利用性を高めるため。

ソースコードから実行可能ファイルを生成する場合、1ファイルの更新で全ソースコードを再コンパイルする必要がある。
これを避けるために機械語に変換しておき後でlinkerで結合する方法をとっている。

## アドレスはどう決まる？
段階による

### Objectファイル
Objectファイル内の機械語が格納されるセクションの先頭を基準としたアドレスを指す

### 実行可能ファイル
仮想アドレスを指す

### 実行時

## バイナリの構成

