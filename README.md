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
```
# マウント先のディレクトリを削除（存在する場合）
rm -rf /Volumes/{マウント先}

# マウント
diskutil list
diskutil mount -mountPoint /Volumes/{マウント先} disk5s1

# multipass自体を再起動
sudo launchctl kickstart -k system/com.canonical.multipassd
sudo launchctl start com.canonical.multipassd
sudo launchctl stop com.canonical.multipassd

# VM起動
multipass start {VM name}

# VM内でshell実行
multipass shell witty-topi

# このディレクトリをVM内にマウント
multipass mount ./ {VM name}
```