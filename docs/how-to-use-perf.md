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

`perf list`コマンドで確認可能 コンテナ環境だとやはり見れない
```
$ perf list --details
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
```

#### Software Event
- [tracepoints](https://www.brendangregg.com/perf.html#Tracepoints)もサポートしている 
  - Kernelにハードコードされたイベント
  - scheduler, block I/Oなどが見れる
- 以下で見れる
```
$ man perf_event_open
```
- イベントによってはデフォルトでサンプリングを行う場合がある（-vvオプションやperf_event_open(2) のmanで確認可能）
```
$ perf record -vv -e context-switches /bin/true
DEBUGINFOD_URLS=
nr_cblocks: 0
affinity: SYS
mmap flush: 1
comp level: 0
Problems creating module maps, continuing anyway...
------------------------------------------------------------
perf_event_attr:
  type                             1 (software)
  size                             136
  config                           0x3 (PERF_COUNT_SW_CONTEXT_SWITCHES)
  { sample_period, sample_freq }   4000 <-ここ
  sample_type                      IP|TID|TIME|PERIOD
  read_format                      ID|LOST
```
- 全て収集したい場合は-c 1を指定
```
$ perf record -c 1  -vv -e context-switches node build/sampleWithString.js
DEBUGINFOD_URLS=
nr_cblocks: 0
affinity: SYS
mmap flush: 1
comp level: 0
Problems creating module maps, continuing anyway...
------------------------------------------------------------
perf_event_attr:
  type                             1 (software)
  size                             136
  config                           0x3 (PERF_COUNT_SW_CONTEXT_SWITCHES)
  { sample_period, sample_freq }   1 <- ここが1になっている
  sample_type                      IP|TID|TIME
  read_format                      ID|LOST
  disabled                         1
  inherit                          1
  mmap                             1
```

#### Hardware Event(PMCs)
- CPUに関する低レイヤーの情報を得られる
  - 例
    - CPU Cycles
    - instructions retired
    - memory stall cycles
    - Cache miss
- 一度に数個のイベントのみ記録する
  - カウンターは物理的なリソースでありその上限があるため

#### Kernel Tracepoints
- Kernelにハードコードされた論理的なポイント
  - 例
    - TCPイベント
    - system call
    - file system I/O
    - cpuスケジューラーイベント

#### User-Level Statically Defined Tracing (USDT)
- アプリケーションにハードコードされた論理的なポイント
  - Kernel Tracepointsのユーザーアプリケーション版
- 多くのアプリケーションでは[DTrace](https://www.brendangregg.com/dtrace.html)のサポート目的でトレースポイントが追加されている
  - ない場合は自力でコンパイルする
  - elf形式を直接読むことで確認できる
    - `readelf -n node`

#### Dynamic Tracing
- Kernel、ユーザーアプリケーション内に埋め込まれたトレースポイント
- Tracepointと違って不安定なAPIだが、多くのイベントを取得できる
- 利点
  - プロセスの再起動なしで有効化できる

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

#### CPUの統計
PMCからイベントの統計を取得する
```
$ perf stat node build/sampleWithString.js
add: 4.290s
has: 1.065s
listAllCoordinates: 1.020s

 Performance counter stats for 'node build/sampleWithString.js':

          6,403.64 msec task-clock:u                     #    1.001 CPUs utilized             
                 0      context-switches:u               #    0.000 /sec                      
                 0      cpu-migrations:u                 #    0.000 /sec                      
             7,878      page-faults:u                    #    1.230 K/sec                     
   <not supported>      cycles:u                                                              
   <not supported>      instructions:u                                                        
   <not supported>      branches:u                                                            
   <not supported>      branch-misses:u                                                       

       6.395073711 seconds time elapsed

       6.392953000 seconds user
       0.011994000 seconds sys

```
- IPC(instructions per cycle)などのメトリクスが見れる
- IPC
  - CPUの1サイクルあたりに実行される命令数
    - 1越えが良い
    - 実際に何の命令を実行しているのかは要確認
      - Spin loopに陥っている可能性もある
        - whileの無限ループなどで実態としてタスクが進んでいない状態
  - 大きい値ほど実行される命令のスループットが高いことを示す
- front cycles, backend cyclesなどはCPUのマイクロアーキテクチャに関わる話

-dオプションで詳細も見れる
```
$ perf stat -d node build/sampleWithString.js
add: 4.258s
has: 1.078s
listAllCoordinates: 998.525ms

 Performance counter stats for 'node build/sampleWithString.js':

          6,369.84 msec task-clock:u                     #    1.001 CPUs utilized             
                 0      context-switches:u               #    0.000 /sec                      
                 0      cpu-migrations:u                 #    0.000 /sec                      
             7,908      page-faults:u                    #    1.241 K/sec                     
   <not supported>      cycles:u                                                              
   <not supported>      instructions:u                                                        
   <not supported>      branches:u                                                            
   <not supported>      branch-misses:u                                                       
   <not supported>      L1-dcache-loads:u                                                     
   <not supported>      L1-dcache-load-misses:u                                               
   <not supported>      LLC-loads:u                                                           
   <not supported>      LLC-load-misses:u                                                     

       6.360812128 seconds time elapsed

       6.359873000 seconds user
       0.011999000 seconds sys
```

-eオプションでカウント対象のイベントを絞れる
```
$ perf stat -e context-switches:u node build/sampleWithString.js
add: 4.280s
has: 1.085s
listAllCoordinates: 1.118s

 Performance counter stats for 'node build/sampleWithString.js':

                 0      context-switches:u                                                    

       6.503723962 seconds time elapsed

       6.499896000 seconds user
       0.015002000 seconds sys

```

--repeat, --sync, --pre, --postなどは自動テストに便利

### profiling
命令へのポインタまたはスタックトレースを固定されたintervelでサンプリングすることでCPU利用状況をProfileできる

- -a
  - すべてのCPUでサンプリング
  - コンテナ環境だと権限不足で動かない
- -g
  - スタックトレースをサンプリング
- -F 
  - サンプリング周波数
    - 99にしているのは100にした場合の周期的なイベントがサンプリングされないのを防ぐため
```
$ perf record -F 99 -g -- node build/sampleWithString.js
$ ls -lah perf.data
-rw------- 1 node node 218K Apr 19 17:17 perf.data
```

生成されたperf.dataはさまざまな方法で分析できる 例としては`perf report`コマンド

```
$ perf report --stdio
# To display the perf.data header info, please use --header/--header-only options.
#
#
# Total Lost Samples: 0
#
# Samples: 657  of event 'task-clock:upppH'
# Event count (approx.): 6636363570
#
# Children      Self  Command     Shared Object        Symbol                                                                         >
# ........  ........  ..........  ...................  ...............................................................................>
#
   100.00%     0.00%  MainThread  node                 [.] _start
            |
            ---_start
               __libc_start_main
               0xffffbd81225c
               node::Start(int, char**)
               node::NodeMainInstance::Run()
               |          
                --99.85%--node::LoadEnvironment(node::Environment*, std::function<v8::MaybeLocal<v8::Value> (node::StartExecutionCallb>
                          node::StartExecution(node::Environment*, std::function<v8::MaybeLocal<v8::Value> (node::StartExecutionCallba>
                          node::InternalCallbackScope::~InternalCallbackScope()
                          node::InternalCallbackScope::Close()
```
頂点がCPUで実行されている関数であり、それを呼び出している祖先に遡っている。-Gオプションで反転させることも可能

例えば下の結果の場合は実行時間の99%をextract_bufが占めている
```
    94.12%       dd  [kernel.kallsyms]  [k] _raw_spin_unlock_irqrestore
                 |
                 --- _raw_spin_unlock_irqrestore
                    |          
                    |--90.99%-- extract_buf
```
https://www.brendangregg.com/perf.html より

### Event Profiling
- 時間ではなくCPU Hardwareカウンターでサンプリングする方法
- 以下でカウントに使えるイベント一覧を表示
```
$ perf list | grep Hardware
Error: failed to open tracing events directory
/sys/kernel/tracing/events: No such file or directory
  mem:<addr>[/len][:access]                          [Hardware breakpoint]
``` 
- -cオプションで指定した回数イベントが発生した時にProfilingを行う

```
$ perf record -e L1-dcache-load-misses -c 10000 -g -- node build/sampleWithString.js
Error:
The L1-dcache-load-misses:u event is not supported.
```
- イベントを用いたプロファイリングの場合はSkewと呼ばれる歪みが発生することがある

### Static kernel tracing
- tracepointを使ったサンプリングの例

システムコール実行のサンプリングの例
```
$ perf  stat -e 'syscalls:sys_enter_*' node build/sampleWithStri
ng.js
event syntax error: 'syscalls:sys_enter_*'
                     \___ unknown tracepoint

Error:  Unable to find debugfs/tracefs
Hint:   Was your kernel compiled with debugfs/tracefs support?
Hint:   Is the debugfs/tracefs filesystem mounted?
Hint:   Try 'sudo mount -t debugfs nodev /sys/kernel/debug'
Run 'perf list' for a list of valid events

 Usage: perf stat [<options>] [<command>]

    -e, --event <event>   event selector. use 'perf list' to list available events
```
straceでも同様のことができるが、perfよりも負荷が高い（62倍）

新しいプロセスの作成 'sched:sched:sched_process_exec'イベントで追跡できる（exec syscallが異なるバイナリを実行した場合のイベント）ただforkで起動した例はこのイベントは起きず、またexecをアドレス空間のリセットに使う例もあるので必ずしも新しいプロセス実行とイコールではない
```
$ sudo perf record -e 'sched:sched:sched_process_exec' -a
```

他にもネットワーク接続をトレースできたりする
```
$ perf record -e syscalls:sys_enter_connect -a
$ perf report --stdio

# Stack traceを記録する（-g）ことでなぜ実行されたのかを調査できる
$ perf record -e syscalls:sys_enter_connect -ag
$ perf report --stdio
```

### Static User tracing
ユーザー空間で実行されるアプリケーションにUSDT probeが追加されている場合、そのイベントをカウントできる。

```
# イベントを追加
# バイナリ内にprobeが定義されていないとダメそう（ただインストールしたものだとイベントが追加されなかった）
$ perf buildid-cache --add `which node`

# perf list | grep sdt_node
  sdt_node:gc__done                                  [SDT event]
  sdt_node:gc__start                                 [SDT event]
  sdt_node:http__client__request                     [SDT event]
  sdt_node:http__client__response                    [SDT event]
  sdt_node:http__server__request                     [SDT event]
  sdt_node:http__server__response                    [SDT event]
  sdt_node:net__server__connection                   [SDT event]
  sdt_node:net__stream__end                          [SDT event]
```

### Dynamic Tracing
Dynamic tracingを利用するため、以下のKernel configを有効化しておく必要がある

- Dynamic Tracingの有効化
  - CONFIG_KPROBES
  - CONFIG_KPROBE_EVENTS
- frame pointerの有効化
  - CONFIG_FRAME_POINTER
- ユーザー空間のトレースの有効化
  - CONFIG_UPROBES
  - CONFIG_UPROBE_EVENTS

probeをeventとして追加し、他perfコマンドで使える
ToDo どんなprobeが使えるか調査する方法
```
# sizeも取得できる
$ perf probe --add 'tcp_sendmsg size'

# 全CPUでprobe:tcp_sendmsgが発生した時のstack traceを取得
$ perf record -e probe:tcp_sendmsg -a -g -- sleep 5

# -xでtracepointをイベントとして追加したい実行ファイルまたはShared Objectを指定
# -Fでイベントとして追加する関数の候補を選択
$ perf probe -x /lib/aarch64-linux-gnu/libc.so -F
Failed to load symbols in /usr/lib/aarch64-linux-gnu/libc.so
  Error: Failed to show functions.
```

### Scheduler Analysis
Linux KernelのCPU scheduleの分析ができる。
オーバーヘッドが大きいため注意

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