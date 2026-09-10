# 系统级快捷键说明

## 结论

思源插件 API 没有提供操作系统级的全局快捷键注册能力：

- 插件内的 `addCommand()` 只注册**应用内**快捷键（思源处于前台时有效），如快速弹窗默认的 `Alt+Shift+C`。
- Electron 的 `globalShortcut` 属于主进程能力，插件运行在沙箱化的渲染进程中，无法调用。

因此"思源在后台时也能一键呼出打卡窗口"无法由插件自身实现。

## 替代方案：AutoHotkey 伴生脚本（Windows）

将以下内容保存为 `checkin-hotkey.ahk`（需安装 [AutoHotkey v2](https://www.autohotkey.com/)），双击运行后即可用 `Ctrl+Alt+C` 在系统任意位置呼出思源并触发打卡弹窗：

```autohotkey
; 小驴打卡 · 系统级快捷键伴生脚本（AutoHotkey v2）
; Ctrl+Alt+C：把思源带到前台并触发快速打卡弹窗（Alt+Shift+C）
^!c:: {
    if WinExist("ahk_exe SiYuan.exe") {
        WinActivate
        WinWaitActive "ahk_exe SiYuan.exe",, 2
        Send "!+c"
    } else {
        Run "siyuan://"
        WinWaitActive "ahk_exe SiYuan.exe",, 5
        Send "!+c"
    }
}
```

说明：

- 思源的可执行文件名按实际安装调整（如 `SiYuan.exe`）。
- `siyuan://` 协议可在思源未运行时拉起应用（需思源注册协议）。
- 弹窗本身是思源内部窗口，无法脱离思源单独显示；脚本只能保证"一键到打卡窗口"，无法让思源最小化而只留弹窗。

macOS / Linux 用户可用同类工具（Keyboard Maestro / xdotool）实现相同按键序列。
