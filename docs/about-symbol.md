# Symbolについて

## 疑問
- objectファイルって何 -> Done
- アドレスはどう決まるの？-> Done
    - メモリ上のアドレスではないはず（実行のタイミングごとに変わるため）
    - perfコマンドはどうやって辿っている？
- 自分でソースコード -> Objectファイル のコンパイルを行い、中身を見てみる -> Done
- 実行可能ファイルの実行時、どのように配置され仮想アドレスが決まるか確認する -> Done
- 最終的なバイナリにはどう格納されている？
- objectファイルについてだけ述べられているが、他の言語ではどう？ -> Done
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

### ELFフォーマットとは
バイナリファイル形式の一つ。Linuxで主に使われる（そのためMac上のgccコマンドでコンパイルしたバイナリは別の形式になっている）

### 種類
- Relocatable file
     - objectファイル
     - linkerの入力
     - e_typeの値がET_REL
- Shared object file
     - Shered Objectのファイル
     - linkerの入力
     - e_typeの値がET_DYN
- Executable file
     - 実行可能ファイル
     - linkerの出力
     - e_typeの値がET_EXEC



メモ:配置とはどのような操作を表している？配置という言葉が文脈に固有の表現を持っていそう

#### 構造
ELF形式のobjectファイルはLinkingと実行の二つで用いられるが、これらごとにELFファイル内の要素の認識が異なる

以下はいずれかに存在する構成要素の一覧

- ELFヘッダ
     - ファイルの先頭に存在
     - ELF識別子、アーキテクチャ情報、他二つのヘッダへの情報をもつ
- セクション
     - ELFファイルの視点から扱うファイルの最小単位
     - Linkされるファイルとして扱われる時の最小単位
     - 以下は種類（代表的なもの）
          - .text -> 機械語
          - .data -> 初期化済みの変数
          - .symtab -> シンボルテーブル
- セグメント
     - セクションの集合
     - メモリ上にmappedされる時の最小単位
     - 以下は種類   
          - Text segment(.text, .rodata, .hash)
          - Data segmennt(.data, .dynamicなど)
- プログラムヘッダ
     - 実行可能ファイルの場合は必須
     - セクジョンがどのような属性でどこに読み込まれるかを保持する
          - 読み込まれる場所が決まってる？
     - 実行時にファイルローダーによってディスクから読み取られるセグメントの数だけ存在する
     - 物理アドレスの記載があるが、ほとんどのケースでは無視してよい
          - 実際の物理アドレスが決定されるのはプロセスとして実行されるタイミングのため
     - p_vaddrの値で各セグメントがVirtualMemeoryにおいてどのアドレスに置かれるかが指定される
- セクションヘッダ
     - objectファイルの場合は必須
     - 一般的にファイルの末端に存在する
          - バイナリの実行には必須ではない情報が含まれるため
     - objectファイルの論理的な構造を記述する部分

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

##### 前提知識
- プロセスが実行される時の仮想アドレスはlinkerがlink時に決定している
     - Program headerで指定されたVirtual addressを見て実行開始 -> プロセスが指したVirtual addressがMMUで物理アドレスに変換 -> ページングなどの処理を経て参照

##### 中身の確認

シンボルテーブルの中身
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
アドレスが0始まりではない なぜ？
```
> nm a.out 
0000000100000000 T __mh_execute_header
0000000100003ee4 T _main
                 U _printf
0000000100003f4c T _sum
```

`readelf`コマンドの結果
```
$ readelf -a main.o 
ELF Header:
  Magic:   7f 45 4c 46 02 01 01 00 00 00 00 00 00 00 00 00 
  Class:                             ELF64
  Data:                              2's complement, little endian
  Version:                           1 (current)
  OS/ABI:                            UNIX - System V
  ABI Version:                       0
  Type:                              REL (Relocatable file)
  Machine:                           AArch64
  Version:                           0x1
  Entry point address:               0x0
  Start of program headers:          0 (bytes into file)
  Start of section headers:          944 (bytes into file)
  Flags:                             0x0
  Size of this header:               64 (bytes)
  Size of program headers:           0 (bytes)
  Number of program headers:         0
  Size of section headers:           64 (bytes)
  Number of section headers:         13
  Section header string table index: 12

Section Headers:
  [Nr] Name              Type             Address           Offset
       Size              EntSize          Flags  Link  Info  Align
  [ 0]                   NULL             0000000000000000  00000000
       0000000000000000  0000000000000000           0     0     0
  [ 1] .text             PROGBITS         0000000000000000  00000040
       0000000000000048  0000000000000000  AX       0     0     4
  [ 2] .rela.text        RELA             0000000000000000  00000288
       00000000000000a8  0000000000000018   I      10     1     8
  [ 3] .data             PROGBITS         0000000000000000  00000088
       0000000000000000  0000000000000000  WA       0     0     1
  [ 4] .bss              NOBITS           0000000000000000  00000088
       0000000000000000  0000000000000000  WA       0     0     1
  [ 5] .rodata           PROGBITS         0000000000000000  00000088
       0000000000000020  0000000000000000   A       0     0     8
  [ 6] .comment          PROGBITS         0000000000000000  000000a8
       0000000000000020  0000000000000001  MS       0     0     1
  [ 7] .note.GNU-stack   PROGBITS         0000000000000000  000000c8
       0000000000000000  0000000000000000           0     0     1
  [ 8] .eh_frame         PROGBITS         0000000000000000  000000c8
       0000000000000038  0000000000000000   A       0     0     8
  [ 9] .rela.eh_frame    RELA             0000000000000000  00000330
       0000000000000018  0000000000000018   I      10     8     8
  [10] .symtab           SYMTAB           0000000000000000  00000100
       0000000000000168  0000000000000018          11    12     8
  [11] .strtab           STRTAB           0000000000000000  00000268
       000000000000001e  0000000000000000           0     0     1
  [12] .shstrtab         STRTAB           0000000000000000  00000348
       0000000000000061  0000000000000000           0     0     1
Key to Flags:
  W (write), A (alloc), X (execute), M (merge), S (strings), I (info),
  L (link order), O (extra OS processing required), G (group), T (TLS),
  C (compressed), x (unknown), o (OS specific), E (exclude),
  D (mbind), p (processor specific)

There are no section groups in this file.

There are no program headers in this file.

There is no dynamic section in this file.

Relocation section '.rela.text' at offset 0x288 contains 7 entries:
  Offset          Info           Type           Sym. Value    Sym. Name + Addend
000000000018  000d0000011b R_AARCH64_CALL26  0000000000000000 sum + 0
000000000020  000500000113 R_AARCH64_ADR_PRE 0000000000000000 .rodata + 0
000000000024  000500000115 R_AARCH64_ADD_ABS 0000000000000000 .rodata + 0
000000000028  000e0000011b R_AARCH64_CALL26  0000000000000000 printf + 0
000000000030  000500000113 R_AARCH64_ADR_PRE 0000000000000000 .rodata + 10
000000000034  000500000115 R_AARCH64_ADD_ABS 0000000000000000 .rodata + 10
000000000038  000e0000011b R_AARCH64_CALL26  0000000000000000 printf + 0

Relocation section '.rela.eh_frame' at offset 0x330 contains 1 entry:
  Offset          Info           Type           Sym. Value    Sym. Name + Addend
00000000001c  000200000105 R_AARCH64_PREL32  0000000000000000 .text + 0

The decoding of unwind sections for machine type AArch64 is not currently supported.

Symbol table '.symtab' contains 15 entries:
   Num:    Value          Size Type    Bind   Vis      Ndx Name
     0: 0000000000000000     0 NOTYPE  LOCAL  DEFAULT  UND 
     1: 0000000000000000     0 FILE    LOCAL  DEFAULT  ABS main.c
     2: 0000000000000000     0 SECTION LOCAL  DEFAULT    1 .text
     3: 0000000000000000     0 SECTION LOCAL  DEFAULT    3 .data
     4: 0000000000000000     0 SECTION LOCAL  DEFAULT    4 .bss
     5: 0000000000000000     0 SECTION LOCAL  DEFAULT    5 .rodata
     6: 0000000000000000     0 NOTYPE  LOCAL  DEFAULT    5 $d
     7: 0000000000000000     0 NOTYPE  LOCAL  DEFAULT    1 $x
     8: 0000000000000000     0 SECTION LOCAL  DEFAULT    7 .note.GNU-stack
     9: 0000000000000014     0 NOTYPE  LOCAL  DEFAULT    8 $d
    10: 0000000000000000     0 SECTION LOCAL  DEFAULT    8 .eh_frame
    11: 0000000000000000     0 SECTION LOCAL  DEFAULT    6 .comment
    12: 0000000000000000    72 FUNC    GLOBAL DEFAULT    1 main
    13: 0000000000000000     0 NOTYPE  GLOBAL DEFAULT  UND sum
    14: 0000000000000000     0 NOTYPE  GLOBAL DEFAULT  UND printf

No version information found in this file.

$ readelf -a calc.o 
ELF Header:
  Magic:   7f 45 4c 46 02 01 01 00 00 00 00 00 00 00 00 00 
  Class:                             ELF64
  Data:                              2's complement, little endian
  Version:                           1 (current)
  OS/ABI:                            UNIX - System V
  ABI Version:                       0
  Type:                              REL (Relocatable file)
  Machine:                           AArch64
  Version:                           0x1
  Entry point address:               0x0
  Start of program headers:          0 (bytes into file)
  Start of section headers:          584 (bytes into file)
  Flags:                             0x0
  Size of this header:               64 (bytes)
  Size of program headers:           0 (bytes)
  Number of program headers:         0
  Size of section headers:           64 (bytes)
  Number of section headers:         11
  Section header string table index: 10

Section Headers:
  [Nr] Name              Type             Address           Offset
       Size              EntSize          Flags  Link  Info  Align
  [ 0]                   NULL             0000000000000000  00000000
       0000000000000000  0000000000000000           0     0     0
  [ 1] .text             PROGBITS         0000000000000000  00000040
       0000000000000028  0000000000000000  AX       0     0     4
  [ 2] .data             PROGBITS         0000000000000000  00000068
       0000000000000000  0000000000000000  WA       0     0     1
  [ 3] .bss              NOBITS           0000000000000000  00000068
       0000000000000000  0000000000000000  WA       0     0     1
  [ 4] .comment          PROGBITS         0000000000000000  00000068
       0000000000000020  0000000000000001  MS       0     0     1
  [ 5] .note.GNU-stack   PROGBITS         0000000000000000  00000088
       0000000000000000  0000000000000000           0     0     1
  [ 6] .eh_frame         PROGBITS         0000000000000000  00000088
       0000000000000030  0000000000000000   A       0     0     8
  [ 7] .rela.eh_frame    RELA             0000000000000000  000001d8
       0000000000000018  0000000000000018   I       8     6     8
  [ 8] .symtab           SYMTAB           0000000000000000  000000b8
       0000000000000108  0000000000000018           9    10     8
  [ 9] .strtab           STRTAB           0000000000000000  000001c0
       0000000000000012  0000000000000000           0     0     1
  [10] .shstrtab         STRTAB           0000000000000000  000001f0
       0000000000000054  0000000000000000           0     0     1
Key to Flags:
  W (write), A (alloc), X (execute), M (merge), S (strings), I (info),
  L (link order), O (extra OS processing required), G (group), T (TLS),
  C (compressed), x (unknown), o (OS specific), E (exclude),
  D (mbind), p (processor specific)

There are no section groups in this file.

There are no program headers in this file.

There is no dynamic section in this file.

Relocation section '.rela.eh_frame' at offset 0x1d8 contains 1 entry:
  Offset          Info           Type           Sym. Value    Sym. Name + Addend
00000000001c  000200000105 R_AARCH64_PREL32  0000000000000000 .text + 0

The decoding of unwind sections for machine type AArch64 is not currently supported.

Symbol table '.symtab' contains 11 entries:
   Num:    Value          Size Type    Bind   Vis      Ndx Name
     0: 0000000000000000     0 NOTYPE  LOCAL  DEFAULT  UND 
     1: 0000000000000000     0 FILE    LOCAL  DEFAULT  ABS calc.c
     2: 0000000000000000     0 SECTION LOCAL  DEFAULT    1 .text
     3: 0000000000000000     0 SECTION LOCAL  DEFAULT    2 .data
     4: 0000000000000000     0 SECTION LOCAL  DEFAULT    3 .bss
     5: 0000000000000000     0 NOTYPE  LOCAL  DEFAULT    1 $x
     6: 0000000000000000     0 SECTION LOCAL  DEFAULT    5 .note.GNU-stack
     7: 0000000000000014     0 NOTYPE  LOCAL  DEFAULT    6 $d
     8: 0000000000000000     0 SECTION LOCAL  DEFAULT    6 .eh_frame
     9: 0000000000000000     0 SECTION LOCAL  DEFAULT    4 .comment
    10: 0000000000000000    40 FUNC    GLOBAL DEFAULT    1 sum

No version information found in this file.

$ readelf -a a.out 
ELF Header:
  Magic:   7f 45 4c 46 02 01 01 00 00 00 00 00 00 00 00 00 
  Class:                             ELF64
  Data:                              2's complement, little endian
  Version:                           1 (current)
  OS/ABI:                            UNIX - System V
  ABI Version:                       0
  Type:                              DYN (Position-Independent Executable file)
  Machine:                           AArch64
  Version:                           0x1
  Entry point address:               0x680
  Start of program headers:          64 (bytes into file)
  Start of section headers:          68688 (bytes into file)
  Flags:                             0x0
  Size of this header:               64 (bytes)
  Size of program headers:           56 (bytes)
  Number of program headers:         10
  Size of section headers:           64 (bytes)
  Number of section headers:         29
  Section header string table index: 28

Section Headers:
  [Nr] Name              Type             Address           Offset
       Size              EntSize          Flags  Link  Info  Align
  [ 0]                   NULL             0000000000000000  00000000
       0000000000000000  0000000000000000           0     0     0
  [ 1] .note.gnu.bu[...] NOTE             0000000000000270  00000270
       0000000000000024  0000000000000000   A       0     0     4
  [ 2] .interp           PROGBITS         0000000000000294  00000294
       000000000000001b  0000000000000000   A       0     0     1
  [ 3] .gnu.hash         GNU_HASH         00000000000002b0  000002b0
       000000000000001c  0000000000000000   A       4     0     8
  [ 4] .dynsym           DYNSYM           00000000000002d0  000002d0
       00000000000000f0  0000000000000018   A       5     3     8
  [ 5] .dynstr           STRTAB           00000000000003c0  000003c0
       0000000000000094  0000000000000000   A       0     0     1
  [ 6] .gnu.version      VERSYM           0000000000000454  00000454
       0000000000000014  0000000000000002   A       4     0     2
  [ 7] .gnu.version_r    VERNEED          0000000000000468  00000468
       0000000000000030  0000000000000000   A       5     1     8
  [ 8] .rela.dyn         RELA             0000000000000498  00000498
       00000000000000c0  0000000000000018   A       4     0     8
  [ 9] .rela.plt         RELA             0000000000000558  00000558
       0000000000000078  0000000000000018  AI       4    22     8
  [10] .init             PROGBITS         00000000000005d0  000005d0
       000000000000001c  0000000000000000  AX       0     0     4
  [11] .plt              PROGBITS         00000000000005f0  000005f0
       0000000000000070  0000000000000000  AX       0     0     16
  [12] .text             PROGBITS         0000000000000680  00000680
       0000000000000198  0000000000000000  AX       0     0     64
  [13] .fini             PROGBITS         0000000000000818  00000818
       0000000000000018  0000000000000000  AX       0     0     4
  [14] .rodata           PROGBITS         0000000000000830  00000830
       0000000000000028  0000000000000000   A       0     0     8
  [15] .eh_frame_hdr     PROGBITS         0000000000000858  00000858
       0000000000000044  0000000000000000   A       0     0     4
  [16] .eh_frame         PROGBITS         00000000000008a0  000008a0
       00000000000000cc  0000000000000000   A       0     0     8
  [17] .note.ABI-tag     NOTE             000000000000096c  0000096c
       0000000000000020  0000000000000000   A       0     0     4
  [18] .init_array       INIT_ARRAY       000000000001fdc8  0000fdc8
       0000000000000008  0000000000000008  WA       0     0     8
  [19] .fini_array       FINI_ARRAY       000000000001fdd0  0000fdd0
       0000000000000008  0000000000000008  WA       0     0     8
  [20] .dynamic          DYNAMIC          000000000001fdd8  0000fdd8
       00000000000001e0  0000000000000010  WA       5     0     8
  [21] .got              PROGBITS         000000000001ffb8  0000ffb8
       0000000000000030  0000000000000008  WA       0     0     8
  [22] .got.plt          PROGBITS         000000000001ffe8  0000ffe8
       0000000000000040  0000000000000008  WA       0     0     8
  [23] .data             PROGBITS         0000000000020028  00010028
       0000000000000010  0000000000000000  WA       0     0     8
  [24] .bss              NOBITS           0000000000020038  00010038
       0000000000000008  0000000000000000  WA       0     0     1
  [25] .comment          PROGBITS         0000000000000000  00010038
       000000000000001f  0000000000000001  MS       0     0     1
  [26] .symtab           SYMTAB           0000000000000000  00010058
       00000000000008b8  0000000000000018          27    69     8
  [27] .strtab           STRTAB           0000000000000000  00010910
       0000000000000239  0000000000000000           0     0     1
  [28] .shstrtab         STRTAB           0000000000000000  00010b49
       0000000000000103  0000000000000000           0     0     1
Key to Flags:
  W (write), A (alloc), X (execute), M (merge), S (strings), I (info),
  L (link order), O (extra OS processing required), G (group), T (TLS),
  C (compressed), x (unknown), o (OS specific), E (exclude),
  D (mbind), p (processor specific)

There are no section groups in this file.

Program Headers:
  Type           Offset             VirtAddr           PhysAddr
                 FileSiz            MemSiz              Flags  Align
  PHDR           0x0000000000000040 0x0000000000000040 0x0000000000000040
                 0x0000000000000230 0x0000000000000230  R      0x8
  INTERP         0x0000000000000294 0x0000000000000294 0x0000000000000294
                 0x000000000000001b 0x000000000000001b  R      0x1
      [Requesting program interpreter: /lib/ld-linux-aarch64.so.1]
  LOAD           0x0000000000000000 0x0000000000000000 0x0000000000000000
                 0x000000000000098c 0x000000000000098c  R E    0x10000
  LOAD           0x000000000000fdc8 0x000000000001fdc8 0x000000000001fdc8
                 0x0000000000000270 0x0000000000000278  RW     0x10000
  DYNAMIC        0x000000000000fdd8 0x000000000001fdd8 0x000000000001fdd8
                 0x00000000000001e0 0x00000000000001e0  RW     0x8
  NOTE           0x0000000000000270 0x0000000000000270 0x0000000000000270
                 0x0000000000000024 0x0000000000000024  R      0x4
  NOTE           0x000000000000096c 0x000000000000096c 0x000000000000096c
                 0x0000000000000020 0x0000000000000020  R      0x4
  GNU_EH_FRAME   0x0000000000000858 0x0000000000000858 0x0000000000000858
                 0x0000000000000044 0x0000000000000044  R      0x4
  GNU_STACK      0x0000000000000000 0x0000000000000000 0x0000000000000000
                 0x0000000000000000 0x0000000000000000  RW     0x10
  GNU_RELRO      0x000000000000fdc8 0x000000000001fdc8 0x000000000001fdc8
                 0x0000000000000238 0x0000000000000238  R      0x1

 Section to Segment mapping:
  Segment Sections...
   00     
   01     .interp 
   02     .note.gnu.build-id .interp .gnu.hash .dynsym .dynstr .gnu.version .gnu.version_r .rela.dyn .rela.plt .init .plt .text .fini .rodata .eh_frame_hdr .eh_frame .note.ABI-tag 
   03     .init_array .fini_array .dynamic .got .got.plt .data .bss 
   04     .dynamic 
   05     .note.gnu.build-id 
   06     .note.ABI-tag 
   07     .eh_frame_hdr 
   08     
   09     .init_array .fini_array .dynamic .got 

Dynamic section at offset 0xfdd8 contains 26 entries:
  Tag        Type                         Name/Value
 0x0000000000000001 (NEEDED)             Shared library: [libc.so.6]
 0x000000000000000c (INIT)               0x5d0
 0x000000000000000d (FINI)               0x818
 0x0000000000000019 (INIT_ARRAY)         0x1fdc8
 0x000000000000001b (INIT_ARRAYSZ)       8 (bytes)
 0x000000000000001a (FINI_ARRAY)         0x1fdd0
 0x000000000000001c (FINI_ARRAYSZ)       8 (bytes)
 0x000000006ffffef5 (GNU_HASH)           0x2b0
 0x0000000000000005 (STRTAB)             0x3c0
 0x0000000000000006 (SYMTAB)             0x2d0
 0x000000000000000a (STRSZ)              148 (bytes)
 0x000000000000000b (SYMENT)             24 (bytes)
 0x0000000000000015 (DEBUG)              0x0
 0x0000000000000003 (PLTGOT)             0x1ffe8
 0x0000000000000002 (PLTRELSZ)           120 (bytes)
 0x0000000000000014 (PLTREL)             RELA
 0x0000000000000017 (JMPREL)             0x558
 0x0000000000000007 (RELA)               0x498
 0x0000000000000008 (RELASZ)             192 (bytes)
 0x0000000000000009 (RELAENT)            24 (bytes)
 0x000000006ffffffb (FLAGS_1)            Flags: PIE
 0x000000006ffffffe (VERNEED)            0x468
 0x000000006fffffff (VERNEEDNUM)         1
 0x000000006ffffff0 (VERSYM)             0x454
 0x000000006ffffff9 (RELACOUNT)          4
 0x0000000000000000 (NULL)               0x0

Relocation section '.rela.dyn' at offset 0x498 contains 8 entries:
  Offset          Info           Type           Sym. Value    Sym. Name + Addend
00000001fdc8  000000000403 R_AARCH64_RELATIV                    7a0
00000001fdd0  000000000403 R_AARCH64_RELATIV                    74c
00000001ffd8  000000000403 R_AARCH64_RELATIV                    7a8
000000020030  000000000403 R_AARCH64_RELATIV                    20030
00000001ffc0  000400000401 R_AARCH64_GLOB_DA 0000000000000000 _ITM_deregisterTM[...] + 0
00000001ffc8  000500000401 R_AARCH64_GLOB_DA 0000000000000000 __cxa_finalize@GLIBC_2.17 + 0
00000001ffd0  000600000401 R_AARCH64_GLOB_DA 0000000000000000 __gmon_start__ + 0
00000001ffe0  000800000401 R_AARCH64_GLOB_DA 0000000000000000 _ITM_registerTMCl[...] + 0

Relocation section '.rela.plt' at offset 0x558 contains 5 entries:
  Offset          Info           Type           Sym. Value    Sym. Name + Addend
000000020000  000300000402 R_AARCH64_JUMP_SL 0000000000000000 __libc_start_main@GLIBC_2.34 + 0
000000020008  000500000402 R_AARCH64_JUMP_SL 0000000000000000 __cxa_finalize@GLIBC_2.17 + 0
000000020010  000600000402 R_AARCH64_JUMP_SL 0000000000000000 __gmon_start__ + 0
000000020018  000700000402 R_AARCH64_JUMP_SL 0000000000000000 abort@GLIBC_2.17 + 0
000000020020  000900000402 R_AARCH64_JUMP_SL 0000000000000000 printf@GLIBC_2.17 + 0

The decoding of unwind sections for machine type AArch64 is not currently supported.

Symbol table '.dynsym' contains 10 entries:
   Num:    Value          Size Type    Bind   Vis      Ndx Name
     0: 0000000000000000     0 NOTYPE  LOCAL  DEFAULT  UND 
     1: 00000000000005d0     0 SECTION LOCAL  DEFAULT   10 .init
     2: 0000000000020028     0 SECTION LOCAL  DEFAULT   23 .data
     3: 0000000000000000     0 FUNC    GLOBAL DEFAULT  UND _[...]@GLIBC_2.34 (2)
     4: 0000000000000000     0 NOTYPE  WEAK   DEFAULT  UND _ITM_deregisterT[...]
     5: 0000000000000000     0 FUNC    WEAK   DEFAULT  UND _[...]@GLIBC_2.17 (3)
     6: 0000000000000000     0 NOTYPE  WEAK   DEFAULT  UND __gmon_start__
     7: 0000000000000000     0 FUNC    GLOBAL DEFAULT  UND abort@GLIBC_2.17 (3)
     8: 0000000000000000     0 NOTYPE  WEAK   DEFAULT  UND _ITM_registerTMC[...]
     9: 0000000000000000     0 FUNC    GLOBAL DEFAULT  UND printf@GLIBC_2.17 (3)

Symbol table '.symtab' contains 93 entries:
   Num:    Value          Size Type    Bind   Vis      Ndx Name
     0: 0000000000000000     0 NOTYPE  LOCAL  DEFAULT  UND 
     1: 0000000000000270     0 SECTION LOCAL  DEFAULT    1 .note.gnu.build-id
     2: 0000000000000294     0 SECTION LOCAL  DEFAULT    2 .interp
     3: 00000000000002b0     0 SECTION LOCAL  DEFAULT    3 .gnu.hash
     4: 00000000000002d0     0 SECTION LOCAL  DEFAULT    4 .dynsym
     5: 00000000000003c0     0 SECTION LOCAL  DEFAULT    5 .dynstr
     6: 0000000000000454     0 SECTION LOCAL  DEFAULT    6 .gnu.version
     7: 0000000000000468     0 SECTION LOCAL  DEFAULT    7 .gnu.version_r
     8: 0000000000000498     0 SECTION LOCAL  DEFAULT    8 .rela.dyn
     9: 0000000000000558     0 SECTION LOCAL  DEFAULT    9 .rela.plt
    10: 00000000000005d0     0 SECTION LOCAL  DEFAULT   10 .init
    11: 00000000000005f0     0 SECTION LOCAL  DEFAULT   11 .plt
    12: 0000000000000680     0 SECTION LOCAL  DEFAULT   12 .text
    13: 0000000000000818     0 SECTION LOCAL  DEFAULT   13 .fini
    14: 0000000000000830     0 SECTION LOCAL  DEFAULT   14 .rodata
    15: 0000000000000858     0 SECTION LOCAL  DEFAULT   15 .eh_frame_hdr
    16: 00000000000008a0     0 SECTION LOCAL  DEFAULT   16 .eh_frame
    17: 000000000000096c     0 SECTION LOCAL  DEFAULT   17 .note.ABI-tag
    18: 000000000001fdc8     0 SECTION LOCAL  DEFAULT   18 .init_array
    19: 000000000001fdd0     0 SECTION LOCAL  DEFAULT   19 .fini_array
    20: 000000000001fdd8     0 SECTION LOCAL  DEFAULT   20 .dynamic
    21: 000000000001ffb8     0 SECTION LOCAL  DEFAULT   21 .got
    22: 000000000001ffe8     0 SECTION LOCAL  DEFAULT   22 .got.plt
    23: 0000000000020028     0 SECTION LOCAL  DEFAULT   23 .data
    24: 0000000000020038     0 SECTION LOCAL  DEFAULT   24 .bss
    25: 0000000000000000     0 SECTION LOCAL  DEFAULT   25 .comment
    26: 0000000000000000     0 FILE    LOCAL  DEFAULT  ABS Scrt1.o
    27: 0000000000000680     0 NOTYPE  LOCAL  DEFAULT   12 $x
    28: 00000000000008b4     0 NOTYPE  LOCAL  DEFAULT   16 $d
    29: 000000000000096c     0 NOTYPE  LOCAL  DEFAULT   17 $d
    30: 000000000000096c    32 OBJECT  LOCAL  DEFAULT   17 __abi_tag
    31: 0000000000000830     0 NOTYPE  LOCAL  DEFAULT   14 $d
    32: 0000000000000000     0 FILE    LOCAL  DEFAULT  ABS crti.o
    33: 00000000000006b4     0 NOTYPE  LOCAL  DEFAULT   12 $x
    34: 00000000000006b4    20 FUNC    LOCAL  DEFAULT   12 call_weak_fn
    35: 00000000000005d0     0 NOTYPE  LOCAL  DEFAULT   10 $x
    36: 0000000000000818     0 NOTYPE  LOCAL  DEFAULT   13 $x
    37: 0000000000000000     0 FILE    LOCAL  DEFAULT  ABS crtn.o
    38: 00000000000005e0     0 NOTYPE  LOCAL  DEFAULT   10 $x
    39: 0000000000000824     0 NOTYPE  LOCAL  DEFAULT   13 $x
    40: 0000000000000000     0 FILE    LOCAL  DEFAULT  ABS crtstuff.c
    41: 00000000000006e0     0 NOTYPE  LOCAL  DEFAULT   12 $x
    42: 00000000000006e0     0 FUNC    LOCAL  DEFAULT   12 deregister_tm_clones
    43: 0000000000000710     0 FUNC    LOCAL  DEFAULT   12 register_tm_clones
    44: 0000000000020030     0 NOTYPE  LOCAL  DEFAULT   23 $d
    45: 000000000000074c     0 FUNC    LOCAL  DEFAULT   12 __do_global_dtors_aux
    46: 0000000000020038     1 OBJECT  LOCAL  DEFAULT   24 completed.0
    47: 000000000001fdd0     0 NOTYPE  LOCAL  DEFAULT   19 $d
    48: 000000000001fdd0     0 OBJECT  LOCAL  DEFAULT   19 __do_global_dtor[...]
    49: 00000000000007a0     0 FUNC    LOCAL  DEFAULT   12 frame_dummy
    50: 000000000001fdc8     0 NOTYPE  LOCAL  DEFAULT   18 $d
    51: 000000000001fdc8     0 OBJECT  LOCAL  DEFAULT   18 __frame_dummy_in[...]
    52: 00000000000008c8     0 NOTYPE  LOCAL  DEFAULT   16 $d
    53: 0000000000020038     0 NOTYPE  LOCAL  DEFAULT   24 $d
    54: 0000000000000000     0 FILE    LOCAL  DEFAULT  ABS main.c
    55: 0000000000000838     0 NOTYPE  LOCAL  DEFAULT   14 $d
    56: 00000000000007a8     0 NOTYPE  LOCAL  DEFAULT   12 $x
    57: 0000000000000930     0 NOTYPE  LOCAL  DEFAULT   16 $d
    58: 0000000000000000     0 FILE    LOCAL  DEFAULT  ABS calc.c
    59: 00000000000007f0     0 NOTYPE  LOCAL  DEFAULT   12 $x
    60: 0000000000000950     0 NOTYPE  LOCAL  DEFAULT   16 $d
    61: 0000000000000000     0 FILE    LOCAL  DEFAULT  ABS crtstuff.c
    62: 0000000000000968     0 NOTYPE  LOCAL  DEFAULT   16 $d
    63: 0000000000000968     0 OBJECT  LOCAL  DEFAULT   16 __FRAME_END__
    64: 0000000000000000     0 FILE    LOCAL  DEFAULT  ABS 
    65: 000000000001fdd8     0 OBJECT  LOCAL  DEFAULT  ABS _DYNAMIC
    66: 0000000000000858     0 NOTYPE  LOCAL  DEFAULT   15 __GNU_EH_FRAME_HDR
    67: 000000000001ffb8     0 OBJECT  LOCAL  DEFAULT  ABS _GLOBAL_OFFSET_TABLE_
    68: 00000000000005f0     0 NOTYPE  LOCAL  DEFAULT   11 $x
    69: 0000000000000000     0 FUNC    GLOBAL DEFAULT  UND __libc_start_mai[...]
    70: 0000000000000000     0 NOTYPE  WEAK   DEFAULT  UND _ITM_deregisterT[...]
    71: 0000000000020028     0 NOTYPE  WEAK   DEFAULT   23 data_start
    72: 0000000000020038     0 NOTYPE  GLOBAL DEFAULT   24 __bss_start__
    73: 0000000000000000     0 FUNC    WEAK   DEFAULT  UND __cxa_finalize@G[...]
    74: 0000000000020040     0 NOTYPE  GLOBAL DEFAULT   24 _bss_end__
    75: 0000000000020038     0 NOTYPE  GLOBAL DEFAULT   23 _edata
    76: 0000000000000818     0 FUNC    GLOBAL HIDDEN    13 _fini
    77: 0000000000020040     0 NOTYPE  GLOBAL DEFAULT   24 __bss_end__
    78: 0000000000020028     0 NOTYPE  GLOBAL DEFAULT   23 __data_start
    79: 0000000000000000     0 NOTYPE  WEAK   DEFAULT  UND __gmon_start__
    80: 0000000000020030     0 OBJECT  GLOBAL HIDDEN    23 __dso_handle
    81: 0000000000000000     0 FUNC    GLOBAL DEFAULT  UND abort@GLIBC_2.17
    82: 00000000000007f0    40 FUNC    GLOBAL DEFAULT   12 sum
    83: 0000000000000830     4 OBJECT  GLOBAL DEFAULT   14 _IO_stdin_used
    84: 0000000000020040     0 NOTYPE  GLOBAL DEFAULT   24 _end
    85: 0000000000000680    52 FUNC    GLOBAL DEFAULT   12 _start
    86: 0000000000020040     0 NOTYPE  GLOBAL DEFAULT   24 __end__
    87: 0000000000020038     0 NOTYPE  GLOBAL DEFAULT   24 __bss_start
    88: 00000000000007a8    72 FUNC    GLOBAL DEFAULT   12 main
    89: 0000000000020038     0 OBJECT  GLOBAL HIDDEN    23 __TMC_END__
    90: 0000000000000000     0 NOTYPE  WEAK   DEFAULT  UND _ITM_registerTMC[...]
    91: 0000000000000000     0 FUNC    GLOBAL DEFAULT  UND printf@GLIBC_2.17
    92: 00000000000005d0     0 FUNC    GLOBAL HIDDEN    10 _init

Version symbols section '.gnu.version' contains 10 entries:
 Addr: 0x0000000000000454  Offset: 0x00000454  Link: 4 (.dynsym)
  000:   0 (*local*)       0 (*local*)       0 (*local*)       2 (GLIBC_2.34) 
  004:   1 (*global*)      3 (GLIBC_2.17)    1 (*global*)      3 (GLIBC_2.17) 
  008:   1 (*global*)      3 (GLIBC_2.17) 

Version needs section '.gnu.version_r' contains 1 entry:
 Addr: 0x0000000000000468  Offset: 0x00000468  Link: 5 (.dynstr)
  000000: Version: 1  File: libc.so.6  Cnt: 2
  0x0010:   Name: GLIBC_2.17  Flags: none  Version: 3
  0x0020:   Name: GLIBC_2.34  Flags: none  Version: 2

Displaying notes found in: .note.gnu.build-id
  Owner                Data size        Description
  GNU                  0x00000014       NT_GNU_BUILD_ID (unique build ID bitstring)
    Build ID: b60df1f14152131cd11811568cb41b73ade0d7d6

Displaying notes found in: .note.ABI-tag
  Owner                Data size        Description
  GNU                  0x00000010       NT_GNU_ABI_TAG (ABI version tag)
    OS: Linux, ABI: 3.7.0
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

