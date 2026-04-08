# Perfの使い方

## Perfとは
- LinuxのProfiler tool
- ハードウェア、ソフトウェア（Linux Kernelなど）から横断的に情報を収集し、パフォーマンスを測定する

## インストール
```
sudo apt-get install -y linux-perf
```

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
## 資料
- https://perfwiki.github.io/main/

## 感想
- コンテナ環境では使いづらい
    - 権限の問題