# javascript-performance-tuning
JavaScriptアプリケーションのパフォーマンス関連についての調査用リポジトリ

## How to install
### perf
```
sudo apt-get install -y linux-perf
```

## ToDo
- perfの使い方を復習
- ByteCode -> Machine code変換の詳細なプロセスを調査

## 検証用VMの構築

### 起動時の手順
```
# マウント先のディレクトリを削除（存在する場合）
rm -rf /Volumes/{マウント先}

# マウント
diskutil list
diskutil mount -mountPoint /Volumes/{マウント先} disk5s1

# multipass自体を再起動
sudo launchctl stop com.canonical.multipassd
sudo launchctl kickstart -k system/com.canonical.multipassd
sudo launchctl start com.canonical.multipassd

# VM起動
multipass start {VM name}

# このディレクトリをVM内にマウント
multipass mount ./ {VM name}

# VM内でshell実行
multipass shell {VM name}
```

### VM内での初期設定
作成直後のVMだと以下のようなエラーが出る

```
$ perf record -F 99 -g -- node build/sampleWithString.js
Error:
Failure to open event 'cpu/cycles/Pu' on PMU 'cpu' which will be removed.
Access to performance monitoring and observability operations is limited.
Consider adjusting /proc/sys/kernel/perf_event_paranoid setting to open
access to performance monitoring and observability operations for processes
without CAP_PERFMON, CAP_SYS_PTRACE or CAP_SYS_ADMIN Linux capability.
More information can be found at 'Perf events and tool security' document:
https://www.kernel.org/doc/html/latest/admin-guide/perf-security.html
perf_event_paranoid setting is 4:
  -1: Allow use of (almost) all events by all users
      Ignore mlock limit after perf_event_mlock_kb without CAP_IPC_LOCK
>= 0: Disallow raw and ftrace function tracepoint access
>= 1: Disallow CPU event access
>= 2: Disallow kernel profiling
To make the adjusted perf_event_paranoid setting permanent preserve it
in /etc/sysctl.conf (e.g. kernel.perf_event_paranoid = <setting>)
Error:
Failure to open any events for recording.
```

これはPerfのプロセスに付与されているCapabilityの不足が原因。以下のように対策する
```
# 追加
$ cat /etc/sysctl.conf
kernel.perf_event_paranoid = 1
$ sudo sysctl -p
```