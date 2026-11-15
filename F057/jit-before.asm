; Assembly listing for method Microsoft.AspNetCore.Components.ChangeDetection:MayHaveChanged[int,int](int,int):bool (Tier0)
; Emitting BLENDED_CODE for x64 + VEX + EVEX on Windows
; Tier0 code
; rbp based frame
; partially interruptible
; compiling with minopt

G_M000_IG01:                ;; offset=0x0000
       push     rbp
       sub      rsp, 64
       lea      rbp, [rsp+0x40]
       vxorps   xmm4, xmm4, xmm4
       vmovdqu  ymmword ptr [rbp-0x20], ymm4
       mov      dword ptr [rbp+0x10], ecx
       mov      dword ptr [rbp+0x18], edx
 
G_M000_IG02:                ;; offset=0x0019
       mov      rcx, 0x7FFCFAFDE2C8
       call     [CORINFO_HELP_GET_GCSTATIC_BASE]
       mov      rcx, 0x7FFCFAD78448
       call     CORINFO_HELP_NEWSFAST
       mov      gword ptr [rbp-0x20], rax
       mov      rax, gword ptr [rbp-0x20]
       mov      ecx, dword ptr [rbp+0x10]
       mov      dword ptr [rax+0x08], ecx
       cmp      qword ptr [rbp-0x20], 0
       setne    al
       movzx    eax, al
       mov      dword ptr [rbp-0x04], eax
       mov      rcx, 0x7FFCFAD78448
       call     CORINFO_HELP_NEWSFAST
       mov      gword ptr [rbp-0x20], rax
       mov      rax, gword ptr [rbp-0x20]
       mov      ecx, dword ptr [rbp+0x18]
       mov      dword ptr [rax+0x08], ecx
       cmp      qword ptr [rbp-0x20], 0
       setne    al
       movzx    eax, al
       mov      dword ptr [rbp-0x08], eax
       mov      eax, dword ptr [rbp-0x04]
       cmp      eax, dword ptr [rbp-0x08]
       je       SHORT G_M000_IG04
       mov      eax, 1
 
G_M000_IG03:                ;; offset=0x008C
       add      rsp, 64
       pop      rbp
       ret      
 
G_M000_IG04:                ;; offset=0x0092
       cmp      dword ptr [rbp-0x04], 0
       je       SHORT G_M000_IG07
       mov      rax, 0x1E8006018A8
       mov      gword ptr [rbp-0x10], rax
       mov      rax, 0x1E8006018A8
       mov      gword ptr [rbp-0x18], rax
       mov      rax, gword ptr [rbp-0x10]
       cmp      rax, qword ptr [rbp-0x18]
       jne      SHORT G_M000_IG05
       mov      rcx, gword ptr [rbp-0x10]
       call     [Microsoft.AspNetCore.Components.ChangeDetection:IsKnownImmutableType(System.Type):bool]
       test     eax, eax
       je       SHORT G_M000_IG05
       mov      rcx, 0x7FFCFAD78448
       call     CORINFO_HELP_NEWSFAST
       mov      gword ptr [rbp-0x20], rax
       mov      rax, gword ptr [rbp-0x20]
       mov      ecx, dword ptr [rbp+0x18]
       mov      dword ptr [rax+0x08], ecx
       mov      rdx, gword ptr [rbp-0x20]
       lea      rcx, [rbp+0x10]
       call     [System.Int32:Equals(System.Object):bool:this]
       test     eax, eax
       jne      SHORT G_M000_IG07
 
G_M000_IG05:                ;; offset=0x00FB
       mov      eax, 1
 
G_M000_IG06:                ;; offset=0x0100
       add      rsp, 64
       pop      rbp
       ret      
 
G_M000_IG07:                ;; offset=0x0106
       xor      eax, eax
 
G_M000_IG08:                ;; offset=0x0108
       add      rsp, 64
       pop      rbp
       ret      
 
; Total bytes of code 270 for method Microsoft.AspNetCore.Components.ChangeDetection:MayHaveChanged[int,int](int,int):bool (Tier0)

; Assembly listing for method Microsoft.AspNetCore.Components.ChangeDetection:MayHaveChanged[long,long](long,long):bool (Tier0)
; Emitting BLENDED_CODE for x64 + VEX + EVEX on Windows
; Tier0 code
; rbp based frame
; partially interruptible
; compiling with minopt

G_M000_IG01:                ;; offset=0x0000
       push     rbp
       sub      rsp, 64
       lea      rbp, [rsp+0x40]
       vxorps   xmm4, xmm4, xmm4
       vmovdqu  ymmword ptr [rbp-0x20], ymm4
       mov      qword ptr [rbp+0x10], rcx
       mov      qword ptr [rbp+0x18], rdx
 
G_M000_IG02:                ;; offset=0x001B
       mov      rcx, 0x7FFCFAD9B1D8
       call     CORINFO_HELP_NEWSFAST
       mov      gword ptr [rbp-0x20], rax
       mov      rax, gword ptr [rbp-0x20]
       mov      rcx, qword ptr [rbp+0x10]
       mov      qword ptr [rax+0x08], rcx
       cmp      qword ptr [rbp-0x20], 0
       setne    al
       movzx    eax, al
       mov      dword ptr [rbp-0x04], eax
       mov      rcx, 0x7FFCFAD9B1D8
       call     CORINFO_HELP_NEWSFAST
       mov      gword ptr [rbp-0x20], rax
       mov      rax, gword ptr [rbp-0x20]
       mov      rcx, qword ptr [rbp+0x18]
       mov      qword ptr [rax+0x08], rcx
       cmp      qword ptr [rbp-0x20], 0
       setne    al
       movzx    eax, al
       mov      dword ptr [rbp-0x08], eax
       mov      eax, dword ptr [rbp-0x04]
       cmp      eax, dword ptr [rbp-0x08]
       je       SHORT G_M000_IG04
       mov      eax, 1
 
G_M000_IG03:                ;; offset=0x0082
       add      rsp, 64
       pop      rbp
       ret      
 
G_M000_IG04:                ;; offset=0x0088
       cmp      dword ptr [rbp-0x04], 0
       je       SHORT G_M000_IG07
       mov      rax, 0x1E8006029A0
       mov      gword ptr [rbp-0x10], rax
       mov      rax, 0x1E8006029A0
       mov      gword ptr [rbp-0x18], rax
       mov      rax, gword ptr [rbp-0x10]
       cmp      rax, qword ptr [rbp-0x18]
       jne      SHORT G_M000_IG05
       mov      rcx, gword ptr [rbp-0x10]
       call     [Microsoft.AspNetCore.Components.ChangeDetection:IsKnownImmutableType(System.Type):bool]
       test     eax, eax
       je       SHORT G_M000_IG05
       mov      rcx, 0x7FFCFAD9B1D8
       call     CORINFO_HELP_NEWSFAST
       mov      gword ptr [rbp-0x20], rax
       mov      rax, gword ptr [rbp-0x20]
       mov      rcx, qword ptr [rbp+0x18]
       mov      qword ptr [rax+0x08], rcx
       mov      rdx, gword ptr [rbp-0x20]
       lea      rcx, [rbp+0x10]
       call     [System.Int64:Equals(System.Object):bool:this]
       test     eax, eax
       jne      SHORT G_M000_IG07
 
G_M000_IG05:                ;; offset=0x00F3
       mov      eax, 1
 
G_M000_IG06:                ;; offset=0x00F8
       add      rsp, 64
       pop      rbp
       ret      
 
G_M000_IG07:                ;; offset=0x00FE
       xor      eax, eax
 
G_M000_IG08:                ;; offset=0x0100
       add      rsp, 64
       pop      rbp
       ret      
 
; Total bytes of code 262 for method Microsoft.AspNetCore.Components.ChangeDetection:MayHaveChanged[long,long](long,long):bool (Tier0)

; Assembly listing for method Microsoft.AspNetCore.Components.ChangeDetection:MayHaveChanged[bool,bool](bool,bool):bool (Tier0)
; Emitting BLENDED_CODE for x64 + VEX + EVEX on Windows
; Tier0 code
; rbp based frame
; partially interruptible
; compiling with minopt

G_M000_IG01:                ;; offset=0x0000
       push     rbp
       sub      rsp, 64
       lea      rbp, [rsp+0x40]
       vxorps   xmm4, xmm4, xmm4
       vmovdqu  ymmword ptr [rbp-0x20], ymm4
       mov      dword ptr [rbp+0x10], ecx
       mov      dword ptr [rbp+0x18], edx
 
G_M000_IG02:                ;; offset=0x0019
       mov      rcx, 0x7FFCFAD73E40
       call     CORINFO_HELP_NEWSFAST
       mov      gword ptr [rbp-0x20], rax
       mov      rax, gword ptr [rbp-0x20]
       mov      ecx, dword ptr [rbp+0x10]
       mov      byte  ptr [rax+0x08], cl
       cmp      qword ptr [rbp-0x20], 0
       setne    al
       movzx    eax, al
       mov      dword ptr [rbp-0x04], eax
       mov      rcx, 0x7FFCFAD73E40
       call     CORINFO_HELP_NEWSFAST
       mov      gword ptr [rbp-0x20], rax
       mov      rax, gword ptr [rbp-0x20]
       mov      ecx, dword ptr [rbp+0x18]
       mov      byte  ptr [rax+0x08], cl
       cmp      qword ptr [rbp-0x20], 0
       setne    al
       movzx    eax, al
       mov      dword ptr [rbp-0x08], eax
       mov      eax, dword ptr [rbp-0x04]
       cmp      eax, dword ptr [rbp-0x08]
       je       SHORT G_M000_IG04
       mov      eax, 1
 
G_M000_IG03:                ;; offset=0x007C
       add      rsp, 64
       pop      rbp
       ret      
 
G_M000_IG04:                ;; offset=0x0082
       cmp      dword ptr [rbp-0x04], 0
       je       SHORT G_M000_IG07
       mov      rax, 0x1E800602738
       mov      gword ptr [rbp-0x10], rax
       mov      rax, 0x1E800602738
       mov      gword ptr [rbp-0x18], rax
       mov      rax, gword ptr [rbp-0x10]
       cmp      rax, qword ptr [rbp-0x18]
       jne      SHORT G_M000_IG05
       mov      rcx, gword ptr [rbp-0x10]
       call     [Microsoft.AspNetCore.Components.ChangeDetection:IsKnownImmutableType(System.Type):bool]
       test     eax, eax
       je       SHORT G_M000_IG05
       mov      rcx, 0x7FFCFAD73E40
       call     CORINFO_HELP_NEWSFAST
       mov      gword ptr [rbp-0x20], rax
       mov      rax, gword ptr [rbp-0x20]
       mov      ecx, dword ptr [rbp+0x18]
       mov      byte  ptr [rax+0x08], cl
       mov      rdx, gword ptr [rbp-0x20]
       lea      rcx, [rbp+0x10]
       call     [System.Boolean:Equals(System.Object):bool:this]
       test     eax, eax
       jne      SHORT G_M000_IG07
 
G_M000_IG05:                ;; offset=0x00EB
       mov      eax, 1
 
G_M000_IG06:                ;; offset=0x00F0
       add      rsp, 64
       pop      rbp
       ret      
 
G_M000_IG07:                ;; offset=0x00F6
       xor      eax, eax
 
G_M000_IG08:                ;; offset=0x00F8
       add      rsp, 64
       pop      rbp
       ret      
 
; Total bytes of code 254 for method Microsoft.AspNetCore.Components.ChangeDetection:MayHaveChanged[bool,bool](bool,bool):bool (Tier0)

; Assembly listing for method Microsoft.AspNetCore.Components.ChangeDetection:MayHaveChanged[System.Guid,System.Guid](System.Guid,System.Guid):bool (Tier0)
; Emitting BLENDED_CODE for x64 + VEX + EVEX on Windows
; Tier0 code
; rbp based frame
; partially interruptible
; compiling with minopt

G_M000_IG01:                ;; offset=0x0000
       push     rbp
       sub      rsp, 64
       lea      rbp, [rsp+0x40]
       vxorps   xmm4, xmm4, xmm4
       vmovdqu  ymmword ptr [rbp-0x20], ymm4
       mov      qword ptr [rbp+0x10], rcx
       mov      qword ptr [rbp+0x18], rdx
 
G_M000_IG02:                ;; offset=0x001B
       mov      rdx, qword ptr [rbp+0x10]
       mov      rcx, 0x7FFCFAE53FF8
       call     [CORINFO_HELP_BOX]
       test     rax, rax
       setne    al
       movzx    eax, al
       mov      dword ptr [rbp-0x04], eax
       mov      rdx, qword ptr [rbp+0x18]
       mov      rcx, 0x7FFCFAE53FF8
       call     [CORINFO_HELP_BOX]
       test     rax, rax
       setne    al
       movzx    eax, al
       mov      dword ptr [rbp-0x08], eax
       mov      eax, dword ptr [rbp-0x04]
       cmp      eax, dword ptr [rbp-0x08]
       je       SHORT G_M000_IG04
       mov      eax, 1
 
G_M000_IG03:                ;; offset=0x0068
       add      rsp, 64
       pop      rbp
       ret      
 
G_M000_IG04:                ;; offset=0x006E
       cmp      dword ptr [rbp-0x04], 0
       je       SHORT G_M000_IG07
       mov      rax, 0x1E8006026C0
       mov      gword ptr [rbp-0x10], rax
       mov      rax, 0x1E8006026C0
       mov      gword ptr [rbp-0x18], rax
       mov      rax, gword ptr [rbp-0x10]
       cmp      rax, qword ptr [rbp-0x18]
       jne      SHORT G_M000_IG05
       mov      rcx, gword ptr [rbp-0x10]
       call     [Microsoft.AspNetCore.Components.ChangeDetection:IsKnownImmutableType(System.Type):bool]
       test     eax, eax
       je       SHORT G_M000_IG05
       mov      rdx, qword ptr [rbp+0x18]
       mov      rcx, 0x7FFCFAE53FF8
       call     [CORINFO_HELP_BOX]
       mov      gword ptr [rbp-0x20], rax
       mov      rdx, gword ptr [rbp-0x20]
       mov      rcx, qword ptr [rbp+0x10]
       call     [System.Guid:Equals(System.Object):bool:this]
       test     eax, eax
       jne      SHORT G_M000_IG07
 
G_M000_IG05:                ;; offset=0x00D2
       mov      eax, 1
 
G_M000_IG06:                ;; offset=0x00D7
       add      rsp, 64
       pop      rbp
       ret      
 
G_M000_IG07:                ;; offset=0x00DD
       xor      eax, eax
 
G_M000_IG08:                ;; offset=0x00DF
       add      rsp, 64
       pop      rbp
       ret      
 
; Total bytes of code 229 for method Microsoft.AspNetCore.Components.ChangeDetection:MayHaveChanged[System.Guid,System.Guid](System.Guid,System.Guid):bool (Tier0)

; Assembly listing for method Microsoft.AspNetCore.Components.ChangeDetection:MayHaveChanged[System.DateOnly,System.DateOnly](System.DateOnly,System.DateOnly):bool (Tier0)
; Emitting BLENDED_CODE for x64 + VEX + EVEX on Windows
; Tier0 code
; rbp based frame
; partially interruptible
; compiling with minopt

G_M000_IG01:                ;; offset=0x0000
       push     rbp
       sub      rsp, 64
       lea      rbp, [rsp+0x40]
       vxorps   xmm4, xmm4, xmm4
       vmovdqu  ymmword ptr [rbp-0x20], ymm4
       mov      dword ptr [rbp+0x10], ecx
       mov      dword ptr [rbp+0x18], edx
 
G_M000_IG02:                ;; offset=0x0019
       lea      rdx, [rbp+0x10]
       mov      rcx, 0x7FFCFB062190
       call     [CORINFO_HELP_BOX]
       test     rax, rax
       setne    al
       movzx    eax, al
       mov      dword ptr [rbp-0x04], eax
       lea      rdx, [rbp+0x18]
       mov      rcx, 0x7FFCFB062190
       call     [CORINFO_HELP_BOX]
       test     rax, rax
       setne    al
       movzx    eax, al
       mov      dword ptr [rbp-0x08], eax
       mov      eax, dword ptr [rbp-0x04]
       cmp      eax, dword ptr [rbp-0x08]
       je       SHORT G_M000_IG04
       mov      eax, 1
 
G_M000_IG03:                ;; offset=0x0066
       add      rsp, 64
       pop      rbp
       ret      
 
G_M000_IG04:                ;; offset=0x006C
       cmp      dword ptr [rbp-0x04], 0
       je       SHORT G_M000_IG07
       mov      rax, 0x1E8006053D0
       mov      gword ptr [rbp-0x10], rax
       mov      rax, 0x1E8006053D0
       mov      gword ptr [rbp-0x18], rax
       mov      rax, gword ptr [rbp-0x10]
       cmp      rax, qword ptr [rbp-0x18]
       jne      SHORT G_M000_IG05
       mov      rcx, gword ptr [rbp-0x10]
       call     [Microsoft.AspNetCore.Components.ChangeDetection:IsKnownImmutableType(System.Type):bool]
       test     eax, eax
       je       SHORT G_M000_IG05
       lea      rdx, [rbp+0x18]
       mov      rcx, 0x7FFCFB062190
       call     [CORINFO_HELP_BOX]
       mov      gword ptr [rbp-0x20], rax
       mov      rdx, gword ptr [rbp-0x20]
       lea      rcx, [rbp+0x10]
       call     [System.DateOnly:Equals(System.Object):bool:this]
       test     eax, eax
       jne      SHORT G_M000_IG07
 
G_M000_IG05:                ;; offset=0x00D0
       mov      eax, 1
 
G_M000_IG06:                ;; offset=0x00D5
       add      rsp, 64
       pop      rbp
       ret      
 
G_M000_IG07:                ;; offset=0x00DB
       xor      eax, eax
 
G_M000_IG08:                ;; offset=0x00DD
       add      rsp, 64
       pop      rbp
       ret      
 
; Total bytes of code 227 for method Microsoft.AspNetCore.Components.ChangeDetection:MayHaveChanged[System.DateOnly,System.DateOnly](System.DateOnly,System.DateOnly):bool (Tier0)

; Assembly listing for method Microsoft.AspNetCore.Components.ChangeDetection:MayHaveChanged[System.TimeOnly,System.TimeOnly](System.TimeOnly,System.TimeOnly):bool (Tier0)
; Emitting BLENDED_CODE for x64 + VEX + EVEX on Windows
; Tier0 code
; rbp based frame
; partially interruptible
; compiling with minopt

G_M000_IG01:                ;; offset=0x0000
       push     rbp
       sub      rsp, 64
       lea      rbp, [rsp+0x40]
       vxorps   xmm4, xmm4, xmm4
       vmovdqu  ymmword ptr [rbp-0x20], ymm4
       mov      qword ptr [rbp+0x10], rcx
       mov      qword ptr [rbp+0x18], rdx
 
G_M000_IG02:                ;; offset=0x001B
       lea      rdx, [rbp+0x10]
       mov      rcx, 0x7FFCFB063DC0
       call     [CORINFO_HELP_BOX]
       test     rax, rax
       setne    al
       movzx    eax, al
       mov      dword ptr [rbp-0x04], eax
       lea      rdx, [rbp+0x18]
       mov      rcx, 0x7FFCFB063DC0
       call     [CORINFO_HELP_BOX]
       test     rax, rax
       setne    al
       movzx    eax, al
       mov      dword ptr [rbp-0x08], eax
       mov      eax, dword ptr [rbp-0x04]
       cmp      eax, dword ptr [rbp-0x08]
       je       SHORT G_M000_IG04
       mov      eax, 1
 
G_M000_IG03:                ;; offset=0x0068
       add      rsp, 64
       pop      rbp
       ret      
 
G_M000_IG04:                ;; offset=0x006E
       cmp      dword ptr [rbp-0x04], 0
       je       SHORT G_M000_IG07
       mov      rax, 0x1E800605420
       mov      gword ptr [rbp-0x10], rax
       mov      rax, 0x1E800605420
       mov      gword ptr [rbp-0x18], rax
       mov      rax, gword ptr [rbp-0x10]
       cmp      rax, qword ptr [rbp-0x18]
       jne      SHORT G_M000_IG05
       mov      rcx, gword ptr [rbp-0x10]
       call     [Microsoft.AspNetCore.Components.ChangeDetection:IsKnownImmutableType(System.Type):bool]
       test     eax, eax
       je       SHORT G_M000_IG05
       lea      rdx, [rbp+0x18]
       mov      rcx, 0x7FFCFB063DC0
       call     [CORINFO_HELP_BOX]
       mov      gword ptr [rbp-0x20], rax
       mov      rdx, gword ptr [rbp-0x20]
       lea      rcx, [rbp+0x10]
       call     [System.TimeOnly:Equals(System.Object):bool:this]
       test     eax, eax
       jne      SHORT G_M000_IG07
 
G_M000_IG05:                ;; offset=0x00D2
       mov      eax, 1
 
G_M000_IG06:                ;; offset=0x00D7
       add      rsp, 64
       pop      rbp
       ret      
 
G_M000_IG07:                ;; offset=0x00DD
       xor      eax, eax
 
G_M000_IG08:                ;; offset=0x00DF
       add      rsp, 64
       pop      rbp
       ret      
 
; Total bytes of code 229 for method Microsoft.AspNetCore.Components.ChangeDetection:MayHaveChanged[System.TimeOnly,System.TimeOnly](System.TimeOnly,System.TimeOnly):bool (Tier0)

; Assembly listing for method Microsoft.AspNetCore.Components.ChangeDetection:MayHaveChanged[int,int](int,int):bool (Tier0)
; Emitting BLENDED_CODE for x64 + VEX + EVEX on Windows
; Tier0 code
; rbp based frame
; partially interruptible
; compiling with minopt

G_M000_IG01:                ;; offset=0x0000
       push     rbp
       sub      rsp, 96
       lea      rbp, [rsp+0x60]
       xor      eax, eax
       mov      qword ptr [rbp-0x38], rax
       vxorps   xmm4, xmm4, xmm4
       vmovdqu  ymmword ptr [rbp-0x30], ymm4
       vmovdqa  xmmword ptr [rbp-0x10], xmm4
       mov      dword ptr [rbp+0x10], ecx
       mov      dword ptr [rbp+0x18], edx
 
G_M000_IG02:                ;; offset=0x0024
       mov      rcx, 0x7FFCFB17F0E0
       call     CORINFO_HELP_NEWSFAST
       mov      gword ptr [rbp-0x20], rax
       mov      rax, gword ptr [rbp-0x20]
       mov      ecx, dword ptr [rbp+0x10]
       mov      dword ptr [rax+0x08], ecx
       cmp      qword ptr [rbp-0x20], 0
       setne    al
       movzx    eax, al
       mov      dword ptr [rbp-0x04], eax
       mov      rcx, 0x7FFCFB17F0E0
       call     CORINFO_HELP_NEWSFAST
       mov      gword ptr [rbp-0x28], rax
       mov      rax, gword ptr [rbp-0x28]
       mov      ecx, dword ptr [rbp+0x18]
       mov      dword ptr [rax+0x08], ecx
       cmp      qword ptr [rbp-0x28], 0
       setne    al
       movzx    eax, al
       mov      dword ptr [rbp-0x08], eax
       mov      eax, dword ptr [rbp-0x04]
       cmp      eax, dword ptr [rbp-0x08]
       je       SHORT G_M000_IG04
       mov      eax, 1
 
G_M000_IG03:                ;; offset=0x0087
       add      rsp, 96
       pop      rbp
       ret      
 
G_M000_IG04:                ;; offset=0x008D
       cmp      dword ptr [rbp-0x04], 0
       je       G_M000_IG07
       mov      rax, 0x1E80060B108
       mov      gword ptr [rbp-0x10], rax
       mov      rax, 0x1E80060B108
       mov      gword ptr [rbp-0x18], rax
       mov      rax, gword ptr [rbp-0x10]
       cmp      rax, qword ptr [rbp-0x18]
       jne      SHORT G_M000_IG05
       mov      rcx, gword ptr [rbp-0x10]
       call     [Microsoft.AspNetCore.Components.ChangeDetection:IsKnownImmutableType(System.Type):bool]
       test     eax, eax
       je       SHORT G_M000_IG05
       mov      rcx, 0x7FFCFB17F0E0
       call     CORINFO_HELP_NEWSFAST
       mov      gword ptr [rbp-0x30], rax
       mov      rax, gword ptr [rbp-0x30]
       mov      ecx, dword ptr [rbp+0x18]
       mov      dword ptr [rax+0x08], ecx
       mov      rcx, 0x7FFCFB17F0E0
       call     CORINFO_HELP_NEWSFAST
       mov      gword ptr [rbp-0x38], rax
       mov      rax, gword ptr [rbp-0x38]
       mov      ecx, dword ptr [rbp+0x10]
       mov      dword ptr [rax+0x08], ecx
       mov      rdx, gword ptr [rbp-0x30]
       mov      rcx, gword ptr [rbp-0x38]
       mov      rax, gword ptr [rbp-0x38]
       mov      rax, qword ptr [rax]
       mov      rax, qword ptr [rax+0x40]
       call     [rax+0x10]System.Object:Equals(System.Object):bool:this
       test     eax, eax
       jne      SHORT G_M000_IG07
 
G_M000_IG05:                ;; offset=0x011F
       mov      eax, 1
 
G_M000_IG06:                ;; offset=0x0124
       add      rsp, 96
       pop      rbp
       ret      
 
G_M000_IG07:                ;; offset=0x012A
       xor      eax, eax
 
G_M000_IG08:                ;; offset=0x012C
       add      rsp, 96
       pop      rbp
       ret      
 
; Total bytes of code 306 for method Microsoft.AspNetCore.Components.ChangeDetection:MayHaveChanged[int,int](int,int):bool (Tier0)

; Assembly listing for method Microsoft.AspNetCore.Components.ChangeDetection:MayHaveChanged[System.Nullable`1[int],System.Nullable`1[int]](System.Nullable`1[int],System.Nullable`1[int]):bool (Tier0)
; Emitting BLENDED_CODE for x64 + VEX + EVEX on Windows
; Tier0 code
; rbp based frame
; partially interruptible
; compiling with minopt

G_M000_IG01:                ;; offset=0x0000
       push     rbp
       sub      rsp, 64
       lea      rbp, [rsp+0x40]
       vxorps   xmm4, xmm4, xmm4
       vmovdqu  ymmword ptr [rbp-0x20], ymm4
       mov      qword ptr [rbp+0x10], rcx
       mov      qword ptr [rbp+0x18], rdx
 
G_M000_IG02:                ;; offset=0x001B
       movzx    eax, byte  ptr [rbp+0x10]
       test     eax, eax
       setne    al
       movzx    eax, al
       mov      dword ptr [rbp-0x04], eax
       movzx    eax, byte  ptr [rbp+0x18]
       test     eax, eax
       setne    al
       movzx    eax, al
       mov      dword ptr [rbp-0x08], eax
       mov      eax, dword ptr [rbp-0x04]
       cmp      eax, dword ptr [rbp-0x08]
       je       SHORT G_M000_IG04
       mov      eax, 1
 
G_M000_IG03:                ;; offset=0x0046
       add      rsp, 64
       pop      rbp
       ret      
 
G_M000_IG04:                ;; offset=0x004C
       cmp      dword ptr [rbp-0x04], 0
       je       G_M000_IG07
       lea      rdx, [rbp+0x10]
       mov      rcx, 0x7FFCFADC6DD8
       call     [CORINFO_HELP_BOX_NULLABLE]
       mov      rcx, rax
       call     [System.Object:GetType():System.Type:this]
       mov      gword ptr [rbp-0x10], rax
       lea      rdx, [rbp+0x18]
       mov      rcx, 0x7FFCFADC6DD8
       call     [CORINFO_HELP_BOX_NULLABLE]
       mov      rcx, rax
       call     [System.Object:GetType():System.Type:this]
       mov      gword ptr [rbp-0x18], rax
       mov      rcx, gword ptr [rbp-0x10]
       mov      rdx, gword ptr [rbp-0x18]
       call     [System.Type:op_Inequality(System.Type,System.Type):bool]
       test     eax, eax
       jne      SHORT G_M000_IG05
       mov      rcx, gword ptr [rbp-0x10]
       call     [Microsoft.AspNetCore.Components.ChangeDetection:IsKnownImmutableType(System.Type):bool]
       test     eax, eax
       je       SHORT G_M000_IG05
       lea      rdx, [rbp+0x18]
       mov      rcx, 0x7FFCFADC6DD8
       call     [CORINFO_HELP_BOX_NULLABLE]
       mov      gword ptr [rbp-0x20], rax
       mov      rdx, gword ptr [rbp-0x20]
       lea      rcx, [rbp+0x10]
       call     [System.Nullable`1[int]:Equals(System.Object):bool:this]
       test     eax, eax
       jne      SHORT G_M000_IG07
 
G_M000_IG05:                ;; offset=0x00E2
       mov      eax, 1
 
G_M000_IG06:                ;; offset=0x00E7
       add      rsp, 64
       pop      rbp
       ret      
 
G_M000_IG07:                ;; offset=0x00ED
       xor      eax, eax
 
G_M000_IG08:                ;; offset=0x00EF
       add      rsp, 64
       pop      rbp
       ret      
 
; Total bytes of code 245 for method Microsoft.AspNetCore.Components.ChangeDetection:MayHaveChanged[System.Nullable`1[int],System.Nullable`1[int]](System.Nullable`1[int],System.Nullable`1[int]):bool (Tier0)

; Assembly listing for method Microsoft.AspNetCore.Components.ChangeDetection:MayHaveChanged[System.__Canon,System.__Canon](System.__Canon,System.__Canon):bool (Tier0)
; Emitting BLENDED_CODE for x64 + VEX + EVEX on Windows
; Tier0 code
; rbp based frame
; partially interruptible
; compiling with minopt

G_M000_IG01:                ;; offset=0x0000
       push     rbp
       sub      rsp, 64
       lea      rbp, [rsp+0x40]
       vxorps   xmm4, xmm4, xmm4
       vmovdqu  xmmword ptr [rbp-0x18], xmm4
       xor      eax, eax
       mov      qword ptr [rbp-0x08], rax
       mov      qword ptr [rbp+0x10], rcx
       mov      gword ptr [rbp+0x18], rdx
       mov      gword ptr [rbp+0x20], r8
 
G_M000_IG02:                ;; offset=0x0025
       cmp      qword ptr [rbp+0x18], 0
       setne    al
       movzx    eax, al
       mov      dword ptr [rbp-0x04], eax
       cmp      qword ptr [rbp+0x20], 0
       setne    al
       movzx    eax, al
       mov      dword ptr [rbp-0x08], eax
       mov      eax, dword ptr [rbp-0x04]
       cmp      eax, dword ptr [rbp-0x08]
       je       SHORT G_M000_IG04
       mov      eax, 1
 
G_M000_IG03:                ;; offset=0x004E
       add      rsp, 64
       pop      rbp
       ret      
 
G_M000_IG04:                ;; offset=0x0054
       cmp      dword ptr [rbp-0x04], 0
       je       SHORT G_M000_IG07
       mov      rcx, gword ptr [rbp+0x18]
       call     [System.Object:GetType():System.Type:this]
       mov      gword ptr [rbp-0x10], rax
       mov      rcx, gword ptr [rbp+0x20]
       call     [System.Object:GetType():System.Type:this]
       mov      gword ptr [rbp-0x18], rax
       mov      rcx, gword ptr [rbp-0x10]
       mov      rdx, gword ptr [rbp-0x18]
       call     [System.Type:op_Inequality(System.Type,System.Type):bool]
       test     eax, eax
       jne      SHORT G_M000_IG05
       mov      rcx, gword ptr [rbp-0x10]
       call     [Microsoft.AspNetCore.Components.ChangeDetection:IsKnownImmutableType(System.Type):bool]
       test     eax, eax
       je       SHORT G_M000_IG05
       mov      rcx, gword ptr [rbp+0x18]
       mov      rdx, gword ptr [rbp+0x20]
       mov      rax, gword ptr [rbp+0x18]
       mov      rax, qword ptr [rax]
       mov      rax, qword ptr [rax+0x40]
       call     [rax+0x10]System.Object:Equals(System.Object):bool:this
       test     eax, eax
       jne      SHORT G_M000_IG07
 
G_M000_IG05:                ;; offset=0x00B0
       mov      eax, 1
 
G_M000_IG06:                ;; offset=0x00B5
       add      rsp, 64
       pop      rbp
       ret      
 
G_M000_IG07:                ;; offset=0x00BB
       xor      eax, eax
 
G_M000_IG08:                ;; offset=0x00BD
       add      rsp, 64
       pop      rbp
       ret      
 
; Total bytes of code 195 for method Microsoft.AspNetCore.Components.ChangeDetection:MayHaveChanged[System.__Canon,System.__Canon](System.__Canon,System.__Canon):bool (Tier0)

; Assembly listing for method Microsoft.AspNetCore.Components.ChangeDetection:MayHaveChanged[AutoPerf.WideValue,AutoPerf.WideValue](AutoPerf.WideValue,AutoPerf.WideValue):bool (Tier0)
; Emitting BLENDED_CODE for x64 + VEX + EVEX on Windows
; Tier0 code
; rbp based frame
; partially interruptible
; compiling with minopt

G_M000_IG01:                ;; offset=0x0000
       push     rbp
       sub      rsp, 80
       lea      rbp, [rsp+0x50]
       xor      eax, eax
       mov      qword ptr [rbp-0x28], rax
       vxorps   xmm4, xmm4, xmm4
       vmovdqu  ymmword ptr [rbp-0x20], ymm4
       mov      qword ptr [rbp+0x10], rcx
       mov      qword ptr [rbp+0x18], rdx
 
G_M000_IG02:                ;; offset=0x0021
       mov      rdx, qword ptr [rbp+0x10]
       mov      rcx, 0x7FFCFB17E028
       call     [CORINFO_HELP_BOX]
       test     rax, rax
       setne    al
       movzx    eax, al
       mov      dword ptr [rbp-0x04], eax
       mov      rdx, qword ptr [rbp+0x18]
       mov      rcx, 0x7FFCFB17E028
       call     [CORINFO_HELP_BOX]
       test     rax, rax
       setne    al
       movzx    eax, al
       mov      dword ptr [rbp-0x08], eax
       mov      eax, dword ptr [rbp-0x04]
       cmp      eax, dword ptr [rbp-0x08]
       je       SHORT G_M000_IG04
       mov      eax, 1
 
G_M000_IG03:                ;; offset=0x006E
       add      rsp, 80
       pop      rbp
       ret      
 
G_M000_IG04:                ;; offset=0x0074
       cmp      dword ptr [rbp-0x04], 0
       je       G_M000_IG07
       mov      rax, 0x1E80060B9C8
       mov      gword ptr [rbp-0x10], rax
       mov      rax, 0x1E80060B9C8
       mov      gword ptr [rbp-0x18], rax
       mov      rax, gword ptr [rbp-0x10]
       cmp      rax, qword ptr [rbp-0x18]
       jne      SHORT G_M000_IG05
       mov      rcx, gword ptr [rbp-0x10]
       call     [Microsoft.AspNetCore.Components.ChangeDetection:IsKnownImmutableType(System.Type):bool]
       test     eax, eax
       je       SHORT G_M000_IG05
       mov      rdx, qword ptr [rbp+0x18]
       mov      rcx, 0x7FFCFB17E028
       call     [CORINFO_HELP_BOX]
       mov      gword ptr [rbp-0x20], rax
       mov      rdx, qword ptr [rbp+0x10]
       mov      rcx, 0x7FFCFB17E028
       call     [CORINFO_HELP_BOX]
       mov      gword ptr [rbp-0x28], rax
       mov      rcx, gword ptr [rbp-0x28]
       mov      rdx, gword ptr [rbp-0x20]
       mov      rax, gword ptr [rbp-0x28]
       mov      rax, qword ptr [rax]
       mov      rax, qword ptr [rax+0x40]
       call     [rax+0x10]System.Object:Equals(System.Object):bool:this
       test     eax, eax
       jne      SHORT G_M000_IG07
 
G_M000_IG05:                ;; offset=0x00FC
       mov      eax, 1
 
G_M000_IG06:                ;; offset=0x0101
       add      rsp, 80
       pop      rbp
       ret      
 
G_M000_IG07:                ;; offset=0x0107
       xor      eax, eax
 
G_M000_IG08:                ;; offset=0x0109
       add      rsp, 80
       pop      rbp
       ret      
 
; Total bytes of code 271 for method Microsoft.AspNetCore.Components.ChangeDetection:MayHaveChanged[AutoPerf.WideValue,AutoPerf.WideValue](AutoPerf.WideValue,AutoPerf.WideValue):bool (Tier0)

; Assembly listing for method Microsoft.AspNetCore.Components.ChangeDetection:MayHaveChanged[int,System.__Canon](int,System.__Canon):bool (Tier0)
; Emitting BLENDED_CODE for x64 + VEX + EVEX on Windows
; Tier0 code
; rbp based frame
; partially interruptible
; compiling with minopt

G_M000_IG01:                ;; offset=0x0000
       push     rbp
       sub      rsp, 64
       lea      rbp, [rsp+0x40]
       vxorps   xmm4, xmm4, xmm4
       vmovdqu  ymmword ptr [rbp-0x20], ymm4
       mov      qword ptr [rbp+0x10], rcx
       mov      dword ptr [rbp+0x18], edx
       mov      gword ptr [rbp+0x20], r8
 
G_M000_IG02:                ;; offset=0x001E
       mov      rcx, 0x7FFCFAD78448
       call     CORINFO_HELP_NEWSFAST
       mov      gword ptr [rbp-0x20], rax
       mov      rax, gword ptr [rbp-0x20]
       mov      ecx, dword ptr [rbp+0x18]
       mov      dword ptr [rax+0x08], ecx
       cmp      qword ptr [rbp-0x20], 0
       setne    al
       movzx    eax, al
       mov      dword ptr [rbp-0x04], eax
       cmp      qword ptr [rbp+0x20], 0
       setne    al
       movzx    eax, al
       mov      dword ptr [rbp-0x08], eax
       mov      eax, dword ptr [rbp-0x04]
       cmp      eax, dword ptr [rbp-0x08]
       je       SHORT G_M000_IG04
       mov      eax, 1
 
G_M000_IG03:                ;; offset=0x0064
       add      rsp, 64
       pop      rbp
       ret      
 
G_M000_IG04:                ;; offset=0x006A
       cmp      dword ptr [rbp-0x04], 0
       je       SHORT G_M000_IG07
       mov      rax, 0x1E8006018A8
       mov      gword ptr [rbp-0x10], rax
       mov      rcx, gword ptr [rbp+0x20]
       call     [System.Object:GetType():System.Type:this]
       mov      gword ptr [rbp-0x18], rax
       mov      rax, gword ptr [rbp-0x10]
       cmp      rax, qword ptr [rbp-0x18]
       jne      SHORT G_M000_IG05
       mov      rcx, gword ptr [rbp-0x10]
       call     [Microsoft.AspNetCore.Components.ChangeDetection:IsKnownImmutableType(System.Type):bool]
       test     eax, eax
       je       SHORT G_M000_IG05
       lea      rcx, [rbp+0x18]
       mov      rdx, gword ptr [rbp+0x20]
       call     [System.Int32:Equals(System.Object):bool:this]
       test     eax, eax
       jne      SHORT G_M000_IG07
 
G_M000_IG05:                ;; offset=0x00B6
       mov      eax, 1
 
G_M000_IG06:                ;; offset=0x00BB
       add      rsp, 64
       pop      rbp
       ret      
 
G_M000_IG07:                ;; offset=0x00C1
       xor      eax, eax
 
G_M000_IG08:                ;; offset=0x00C3
       add      rsp, 64
       pop      rbp
       ret      
 
; Total bytes of code 201 for method Microsoft.AspNetCore.Components.ChangeDetection:MayHaveChanged[int,System.__Canon](int,System.__Canon):bool (Tier0)

