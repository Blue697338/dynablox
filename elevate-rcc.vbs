' VBScript to elevate RCCService to admin and run it
Set objShell = CreateObject("Shell.Application")
Set objFSO = CreateObject("Scripting.FileSystemObject")

' Get the directory where this script is located
strScriptPath = objFSO.GetParentFolderName(WScript.ScriptFullName)
strRCCServicePath = strScriptPath & "\RCCService\RCCService.exe"

' Run RCCService with correct parameters
objShell.ShellExecute strRCCServicePath, "-console -placeid:1818", strScriptPath & "\RCCService", "runas", 1
