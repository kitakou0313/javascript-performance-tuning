# Perfの使い方

## Perfとは
- LinuxのProfiler tool
- ハードウェア（CPUなど）、ソフトウェア（Linux Kernelなど）から横断的に情報を収集し、パフォーマンスを測定する
  - Linux Kernelのperf_events interfaceを活用している
- 以下の三つの方法で計装している
  - カーネルのコンテキスト内でのイベントのカウント
  - イベントのサンプリング
    - perf.dataファイルが生成される
  - bpfによるイベント発生時の処理の追加

## インストール
```
sudo apt-get install -y linux-perf
```
## 背景

### イベントについて
カウントされるイベントの例
- ハードウェア関連
  - CPUのPMU（Performant Measure Unit）から
    - 例
      - cycles
        - サイクル数
      - instructions
        - 命令数
      - cache-misses
        - キャッシュミス
    - キャッシュメモリから
      - L1-dcache-load-misses
        - L1 levelのキャッシュでのミス
      - LLC-load-misses
        - 最終レベルでのキャッシュでのミス
- ソフトウェア関連
  - Linux Kernelから
    - 例
      - context-switches
        - コンテキストswitch
      - page-faults
        - ページフォルト
    - ftraceから
      - 例
        - sched:sched_switch
          - スケジューリング
        - syscalls:sys_enter_socket
          - ソケット実行
    - USDT（ユーザー定義のtrace point）
    - Dynamic Tracing
      - ユーザーが動的に追加できるtrace point
      - kprobe（Kernel）、uprobe（ユーザーランドのアプリケーション）
    - Profile
      - 周期的にCPUで実行されている命令およびスタックトレースを記録したもの

### シンボルについて
- メモリ上のアドレスと関数名や変数名の対応
  - これがない場合perfの結果を16進数で取り扱うことになる
- パッケージによるインストールの場合はデバッグパッケージがついてくることもある
  - dbgsym
- elf形式の場合、strippedでなければ良い
- VMにより実行される言語の場合（Node.js, Javaなど）、それぞれの言語の機能で関数との対応関係をシンボルとして渡せる
  - JIT Symbol

### stack traceの追跡について
- frame pointerを有効化してコンパイルすべき
  - Stackの底まで辿れなくなる
- frame pointer
  - Stack frame内の基点となるメモリ上のアドレスを指す値
  - 関数実行時にStackがつまれた際、呼び出し元関数のFPを保持しておき、呼び出し元を辿れるようにする
  - 解説
    - 前提
      - 関数が実行される時対応する新しいスタックが積まれる
    - デバッグ時に呼び出し元の関数を知るため、呼び出し元関数のStackへの参照を保持する必要がある
    - これを実現しているのがFP
      - 関数の処理終了後に呼び出し元に戻るためにはreturn addrを用い、FPは使わない
        - FPをコンパイラのオプションで無効化していても関数呼び出しができるのはこれが理由


### 利用例

## コマンドの構成
主に以下のサブコマンドで構成される
- list
- stat
- record
- report

## サブコマンドの使い方

### perf list
- サポートされるイベントの一覧を表示

```
$ sudo perf list
Error: failed to open tracing events directory
/sys/kernel/tracing/events: No such file or directory

List of pre-defined events (to be used in -e or -M):

  alignment-faults                                   [Software event]
  bpf-output                                         [Software event]
  cgroup-switches                                    [Software event]
  context-switches OR cs                             [Software event]
  cpu-clock                                          [Software event]
  cpu-migrations OR migrations                       [Software event]
  dummy                                              [Software event]
  emulation-faults                                   [Software event]
  major-faults                                       [Software event]
  minor-faults                                       [Software event]
  page-faults OR faults                              [Software event]
  task-clock                                         [Software event]

tool:
  duration_time
  user_time
  system_time
  rNNN                                               [Raw event descriptor]
```

### perf stat
- 実行中に起きたイベント数をカウントする
```
$ perf stat -B dd if=/dev/zero of=/dev/null count=1000000
1000000+0 records in
1000000+0 records out
512000000 bytes (512 MB, 488 MiB) copied, 0.297732 s, 1.7 GB/s

 Performance counter stats for 'dd if=/dev/zero of=/dev/null count=1000000':

            298.26 msec task-clock:u                     #    0.992 CPUs utilized             
                 0      context-switches:u               #    0.000 /sec                      
                 0      cpu-migrations:u                 #    0.000 /sec                      
                61      page-faults:u                    #  204.520 /sec                      
   <not supported>      cycles:u                                                              
   <not supported>      instructions:u                                                        
   <not supported>      branches:u                                                            
   <not supported>      branch-misses:u                                                       

       0.300719125 seconds time elapsed

       0.090057000 seconds user
       0.209134000 seconds sys

$ perf stat node build/sampleWithString.js
add: 4.496s
has: 1.075s
listAllCoordinates: 1.020s

 Performance counter stats for 'node build/sampleWithString.js':

          6,627.83 msec task-clock:u                     #    1.001 CPUs utilized             
                 0      context-switches:u               #    0.000 /sec                      
                 0      cpu-migrations:u                 #    0.000 /sec                      
             7,931      page-faults:u                    #    1.197 K/sec                     
   <not supported>      cycles:u                                                              
   <not supported>      instructions:u                                                        
   <not supported>      branches:u                                                            
   <not supported>      branch-misses:u                                                       

       6.618533920 seconds time elapsed

       6.611124000 seconds user
       0.018115000 seconds sys


node ➜ /workspaces/javascript-performance-tuning (main) $ 
```

Modifierで収集するイベントの数を制限できる 一度にカウントできるハードウェアイベントの数には限りがあり（CPU依存）それを超える数の記録は概算になるため（多重化）
```
```

`-r`で複数回の測定が可能 カウンターの値の平均値と標準偏差が得られる
```
$ perf stat -r 5 sleep 1

 Performance counter stats for 'sleep 1' (5 runs):

              0.83 msec task-clock:u                     #    0.001 CPUs utilized               ( +-  9.22% )
                 0      context-switches:u               #    0.000 /sec                      
                 0      cpu-migrations:u                 #    0.000 /sec                      
                56      page-faults:u                    #   67.672 K/sec                       ( +-  0.44% )
   <not supported>      cycles:u                                                              
   <not supported>      instructions:u                                                        
   <not supported>      branches:u                                                            
   <not supported>      branch-misses:u                                                       

          1.007249 +- 0.000117 seconds time elapsed  ( +-  0.01% )
```

cpuを対象、スレッドを対象、プロセスを対象にカウンタを収集できる（ソフトウェアを実行する側とされる側の視点両方で集計が可能）
```

# -CでCPUを制限
perf stat -B -e cycles:u,instructions:u -a -C 0,2-3 sleep 5
```

実行中のプロセスにアタッチしてのカウンタ測定も可能
```
ps ax | fgrep sshd

 2262 ?        Ss     0:00 /usr/sbin/sshd -D
 2787 pts/0    S+     0:00 fgrep --color=auto sshd

# -pで指定 Ctrl+Cで停止
perf stat -e cycles -p 2262
```

### perf record
プロファイルを取得するコマンド。スレッド視点、プロセス視点、CPU視点で取得できる。
`perf.data`というファイルに書き出されるため、これを他ツールで解析する（`perf report`, `perf annotate`など）

```
# 収集（どの命令を実行しているかのみ）
perf record node build/sampleWithString.js
# スタックトレースを収集（flame graphを生成したい場合はこのオプションを利用）
perf record -g node build/sampleWithString.js
```

収集するタイミングはeventで確認している（Event-based sampling）

### perf report
`perf record`で記録したサンプルを分析する

```
# flame graphを生成
perf script report flamegraph
```

### perf annotate
サンプルの結果を実行される命令レベルで分析できる
アプリケーションが`-ggdb`でコンパイルされている場合はソースコードレベルで分析できる

## 資料
- https://perfwiki.github.io/main/
- https://www.brendangregg.com/perf.html
- https://www.brendangregg.com/blog/2014-09-17/node-flame-graphs-on-linux.html
  - perfコマンドがperf_eventと呼ばれており、ややこしい

## 感想
- コンテナ環境では使いづらい
    - 権限の問題