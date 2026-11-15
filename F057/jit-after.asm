; Assembly listing for method Microsoft.AspNetCore.Components.ChangeDetection:MayHaveChanged[int,int](int,int):bool (Tier0)
; Emitting BLENDED_CODE for x64 + VEX + EVEX on Windows
; Tier0 code
; rbp based frame
; partially interruptible
; compiling with minopt

G_M000_IG01:                ;; offset=0x0000
       push     rbp
       sub      rsp, 80
       lea      rbp, [rsp+0x50]
       vxorps   xmm4, xmm4, xmm4
       vmovdqu  ymmword ptr [rbp-0x30], ymm4
       vmovdqa  xmmword ptr [rbp-0x10], xmm4
       mov      dword ptr [rbp+0x10], ecx
       mov      dword ptr [rbp+0x18], edx
 
G_M000_IG02:                ;; offset=0x001E
       mov      rcx, 0x7FFCFAFCE2C8
       call     [CORINFO_HELP_GET_GCSTATIC_BASE]
       mov      rcx, 0x1DE006018A8
       call     [System.Nullable:GetUnderlyingType(System.Type):System.Type]
       test     rax, rax
       je       SHORT G_M000_IG03
       mov      rcx, 0x7FFCFAD68448
       call     CORINFO_HELP_NEWSFAST
       mov      gword ptr [rbp-0x30], rax
       mov      rax, gword ptr [rbp-0x30]
       mov      ecx, dword ptr [rbp+0x10]
       mov      dword ptr [rax+0x08], ecx
       cmp      qword ptr [rbp-0x30], 0
       setne    al
       movzx    eax, al
       mov      dword ptr [rbp-0x1C], eax
       jmp      SHORT G_M000_IG04
 
G_M000_IG03:                ;; offset=0x0070
       mov      dword ptr [rbp-0x1C], 1
 
G_M000_IG04:                ;; offset=0x0077
       movzx    eax, byte  ptr [rbp-0x1C]
       mov      dword ptr [rbp-0x04], eax
       mov      rcx, 0x1DE006018A8
       call     [System.Nullable:GetUnderlyingType(System.Type):System.Type]
       test     rax, rax
       je       SHORT G_M000_IG05
       mov      rcx, 0x7FFCFAD68448
       call     CORINFO_HELP_NEWSFAST
       mov      gword ptr [rbp-0x28], rax
       mov      rax, gword ptr [rbp-0x28]
       mov      ecx, dword ptr [rbp+0x18]
       mov      dword ptr [rax+0x08], ecx
       cmp      qword ptr [rbp-0x28], 0
       setne    al
       movzx    eax, al
       mov      dword ptr [rbp-0x20], eax
       jmp      SHORT G_M000_IG06
 
G_M000_IG05:                ;; offset=0x00C0
       mov      dword ptr [rbp-0x20], 1
 
G_M000_IG06:                ;; offset=0x00C7
       movzx    eax, byte  ptr [rbp-0x20]
       mov      dword ptr [rbp-0x08], eax
       mov      eax, dword ptr [rbp-0x04]
       cmp      eax, dword ptr [rbp-0x08]
       je       SHORT G_M000_IG08
       mov      eax, 1
 
G_M000_IG07:                ;; offset=0x00DB
       add      rsp, 80
       pop      rbp
       ret      
 
G_M000_IG08:                ;; offset=0x00E1
       cmp      dword ptr [rbp-0x04], 0
       je       SHORT G_M000_IG11
       mov      rax, 0x1DE006018A8
       mov      gword ptr [rbp-0x10], rax
       mov      rax, 0x1DE006018A8
       mov      gword ptr [rbp-0x18], rax
       mov      rax, gword ptr [rbp-0x10]
       cmp      rax, qword ptr [rbp-0x18]
       jne      SHORT G_M000_IG09
       mov      rcx, gword ptr [rbp-0x10]
       call     [Microsoft.AspNetCore.Components.ChangeDetection:IsKnownImmutableType(System.Type):bool]
       test     eax, eax
       je       SHORT G_M000_IG09
       mov      rcx, 0x7FFCFAD68448
       call     CORINFO_HELP_NEWSFAST
       mov      gword ptr [rbp-0x28], rax
       mov      rax, gword ptr [rbp-0x28]
       mov      ecx, dword ptr [rbp+0x18]
       mov      dword ptr [rax+0x08], ecx
       mov      rdx, gword ptr [rbp-0x28]
       lea      rcx, [rbp+0x10]
       call     [System.Int32:Equals(System.Object):bool:this]
       test     eax, eax
       jne      SHORT G_M000_IG11
 
G_M000_IG09:                ;; offset=0x014A
       mov      eax, 1
 
G_M000_IG10:                ;; offset=0x014F
       add      rsp, 80
       pop      rbp
       ret      
 
G_M000_IG11:                ;; offset=0x0155
       xor      eax, eax
 
G_M000_IG12:                ;; offset=0x0157
       add      rsp, 80
       pop      rbp
       ret      
 
; Total bytes of code 349 for method Microsoft.AspNetCore.Components.ChangeDetection:MayHaveChanged[int,int](int,int):bool (Tier0)

; Assembly listing for method Microsoft.AspNetCore.Components.ChangeDetection:MayHaveChanged[long,long](long,long):bool (Tier0)
; Emitting BLENDED_CODE for x64 + VEX + EVEX on Windows
; Tier0 code
; rbp based frame
; partially interruptible
; compiling with minopt

G_M000_IG01:                ;; offset=0x0000
       push     rbp
       sub      rsp, 80
       lea      rbp, [rsp+0x50]
       vxorps   xmm4, xmm4, xmm4
       vmovdqu  ymmword ptr [rbp-0x30], ymm4
       vmovdqa  xmmword ptr [rbp-0x10], xmm4
       mov      qword ptr [rbp+0x10], rcx
       mov      qword ptr [rbp+0x18], rdx
 
G_M000_IG02:                ;; offset=0x0020
       mov      rcx, 0x1DE006029A0
       call     [System.Nullable:GetUnderlyingType(System.Type):System.Type]
       test     rax, rax
       je       SHORT G_M000_IG03
       mov      rcx, 0x7FFCFAD8B1D8
       call     CORINFO_HELP_NEWSFAST
       mov      gword ptr [rbp-0x30], rax
       mov      rax, gword ptr [rbp-0x30]
       mov      rcx, qword ptr [rbp+0x10]
       mov      qword ptr [rax+0x08], rcx
       cmp      qword ptr [rbp-0x30], 0
       setne    al
       movzx    eax, al
       mov      dword ptr [rbp-0x1C], eax
       jmp      SHORT G_M000_IG04
 
G_M000_IG03:                ;; offset=0x0064
       mov      dword ptr [rbp-0x1C], 1
 
G_M000_IG04:                ;; offset=0x006B
       movzx    eax, byte  ptr [rbp-0x1C]
       mov      dword ptr [rbp-0x04], eax
       mov      rcx, 0x1DE006029A0
       call     [System.Nullable:GetUnderlyingType(System.Type):System.Type]
       test     rax, rax
       je       SHORT G_M000_IG05
       mov      rcx, 0x7FFCFAD8B1D8
       call     CORINFO_HELP_NEWSFAST
       mov      gword ptr [rbp-0x28], rax
       mov      rax, gword ptr [rbp-0x28]
       mov      rcx, qword ptr [rbp+0x18]
       mov      qword ptr [rax+0x08], rcx
       cmp      qword ptr [rbp-0x28], 0
       setne    al
       movzx    eax, al
       mov      dword ptr [rbp-0x20], eax
       jmp      SHORT G_M000_IG06
 
G_M000_IG05:                ;; offset=0x00B6
       mov      dword ptr [rbp-0x20], 1
 
G_M000_IG06:                ;; offset=0x00BD
       movzx    eax, byte  ptr [rbp-0x20]
       mov      dword ptr [rbp-0x08], eax
       mov      eax, dword ptr [rbp-0x04]
       cmp      eax, dword ptr [rbp-0x08]
       je       SHORT G_M000_IG08
       mov      eax, 1
 
G_M000_IG07:                ;; offset=0x00D1
       add      rsp, 80
       pop      rbp
       ret      
 
G_M000_IG08:                ;; offset=0x00D7
       cmp      dword ptr [rbp-0x04], 0
       je       SHORT G_M000_IG11
       mov      rax, 0x1DE006029A0
       mov      gword ptr [rbp-0x10], rax
       mov      rax, 0x1DE006029A0
       mov      gword ptr [rbp-0x18], rax
       mov      rax, gword ptr [rbp-0x10]
       cmp      rax, qword ptr [rbp-0x18]
       jne      SHORT G_M000_IG09
       mov      rcx, gword ptr [rbp-0x10]
       call     [Microsoft.AspNetCore.Components.ChangeDetection:IsKnownImmutableType(System.Type):bool]
       test     eax, eax
       je       SHORT G_M000_IG09
       mov      rcx, 0x7FFCFAD8B1D8
       call     CORINFO_HELP_NEWSFAST
       mov      gword ptr [rbp-0x28], rax
       mov      rax, gword ptr [rbp-0x28]
       mov      rcx, qword ptr [rbp+0x18]
       mov      qword ptr [rax+0x08], rcx
       mov      rdx, gword ptr [rbp-0x28]
       lea      rcx, [rbp+0x10]
       call     [System.Int64:Equals(System.Object):bool:this]
       test     eax, eax
       jne      SHORT G_M000_IG11
 
G_M000_IG09:                ;; offset=0x0142
       mov      eax, 1
 
G_M000_IG10:                ;; offset=0x0147
       add      rsp, 80
       pop      rbp
       ret      
 
G_M000_IG11:                ;; offset=0x014D
       xor      eax, eax
 
G_M000_IG12:                ;; offset=0x014F
       add      rsp, 80
       pop      rbp
       ret      
 
; Total bytes of code 341 for method Microsoft.AspNetCore.Components.ChangeDetection:MayHaveChanged[long,long](long,long):bool (Tier0)

; Assembly listing for method Microsoft.AspNetCore.Components.ChangeDetection:MayHaveChanged[bool,bool](bool,bool):bool (Tier0)
; Emitting BLENDED_CODE for x64 + VEX + EVEX on Windows
; Tier0 code
; rbp based frame
; partially interruptible
; compiling with minopt

G_M000_IG01:                ;; offset=0x0000
       push     rbp
       sub      rsp, 80
       lea      rbp, [rsp+0x50]
       vxorps   xmm4, xmm4, xmm4
       vmovdqu  ymmword ptr [rbp-0x30], ymm4
       vmovdqa  xmmword ptr [rbp-0x10], xmm4
       mov      dword ptr [rbp+0x10], ecx
       mov      dword ptr [rbp+0x18], edx
 
G_M000_IG02:                ;; offset=0x001E
       mov      rcx, 0x1DE00602738
       call     [System.Nullable:GetUnderlyingType(System.Type):System.Type]
       test     rax, rax
       je       SHORT G_M000_IG03
       mov      rcx, 0x7FFCFAD63E40
       call     CORINFO_HELP_NEWSFAST
       mov      gword ptr [rbp-0x30], rax
       mov      rax, gword ptr [rbp-0x30]
       mov      ecx, dword ptr [rbp+0x10]
       mov      byte  ptr [rax+0x08], cl
       cmp      qword ptr [rbp-0x30], 0
       setne    al
       movzx    eax, al
       mov      dword ptr [rbp-0x1C], eax
       jmp      SHORT G_M000_IG04
 
G_M000_IG03:                ;; offset=0x0060
       mov      dword ptr [rbp-0x1C], 1
 
G_M000_IG04:                ;; offset=0x0067
       movzx    eax, byte  ptr [rbp-0x1C]
       mov      dword ptr [rbp-0x04], eax
       mov      rcx, 0x1DE00602738
       call     [System.Nullable:GetUnderlyingType(System.Type):System.Type]
       test     rax, rax
       je       SHORT G_M000_IG05
       mov      rcx, 0x7FFCFAD63E40
       call     CORINFO_HELP_NEWSFAST
       mov      gword ptr [rbp-0x28], rax
       mov      rax, gword ptr [rbp-0x28]
       mov      ecx, dword ptr [rbp+0x18]
       mov      byte  ptr [rax+0x08], cl
       cmp      qword ptr [rbp-0x28], 0
       setne    al
       movzx    eax, al
       mov      dword ptr [rbp-0x20], eax
       jmp      SHORT G_M000_IG06
 
G_M000_IG05:                ;; offset=0x00B0
       mov      dword ptr [rbp-0x20], 1
 
G_M000_IG06:                ;; offset=0x00B7
       movzx    eax, byte  ptr [rbp-0x20]
       mov      dword ptr [rbp-0x08], eax
       mov      eax, dword ptr [rbp-0x04]
       cmp      eax, dword ptr [rbp-0x08]
       je       SHORT G_M000_IG08
       mov      eax, 1
 
G_M000_IG07:                ;; offset=0x00CB
       add      rsp, 80
       pop      rbp
       ret      
 
G_M000_IG08:                ;; offset=0x00D1
       cmp      dword ptr [rbp-0x04], 0
       je       SHORT G_M000_IG11
       mov      rax, 0x1DE00602738
       mov      gword ptr [rbp-0x10], rax
       mov      rax, 0x1DE00602738
       mov      gword ptr [rbp-0x18], rax
       mov      rax, gword ptr [rbp-0x10]
       cmp      rax, qword ptr [rbp-0x18]
       jne      SHORT G_M000_IG09
       mov      rcx, gword ptr [rbp-0x10]
       call     [Microsoft.AspNetCore.Components.ChangeDetection:IsKnownImmutableType(System.Type):bool]
       test     eax, eax
       je       SHORT G_M000_IG09
       mov      rcx, 0x7FFCFAD63E40
       call     CORINFO_HELP_NEWSFAST
       mov      gword ptr [rbp-0x28], rax
       mov      rax, gword ptr [rbp-0x28]
       mov      ecx, dword ptr [rbp+0x18]
       mov      byte  ptr [rax+0x08], cl
       mov      rdx, gword ptr [rbp-0x28]
       lea      rcx, [rbp+0x10]
       call     [System.Boolean:Equals(System.Object):bool:this]
       test     eax, eax
       jne      SHORT G_M000_IG11
 
G_M000_IG09:                ;; offset=0x013A
       mov      eax, 1
 
G_M000_IG10:                ;; offset=0x013F
       add      rsp, 80
       pop      rbp
       ret      
 
G_M000_IG11:                ;; offset=0x0145
       xor      eax, eax
 
G_M000_IG12:                ;; offset=0x0147
       add      rsp, 80
       pop      rbp
       ret      
 
; Total bytes of code 333 for method Microsoft.AspNetCore.Components.ChangeDetection:MayHaveChanged[bool,bool](bool,bool):bool (Tier0)

; Assembly listing for method Microsoft.AspNetCore.Components.ChangeDetection:MayHaveChanged[System.Guid,System.Guid](System.Guid,System.Guid):bool (Tier0)
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
       mov      rcx, 0x1DE006026C0
       call     [System.Nullable:GetUnderlyingType(System.Type):System.Type]
       test     rax, rax
       je       SHORT G_M000_IG03
       mov      rdx, qword ptr [rbp+0x10]
       mov      rcx, 0x7FFCFAE43FF8
       call     [CORINFO_HELP_BOX]
       test     rax, rax
       setne    al
       movzx    eax, al
       mov      dword ptr [rbp-0x1C], eax
       jmp      SHORT G_M000_IG04
 
G_M000_IG03:                ;; offset=0x0058
       mov      dword ptr [rbp-0x1C], 1
 
G_M000_IG04:                ;; offset=0x005F
       movzx    eax, byte  ptr [rbp-0x1C]
       mov      dword ptr [rbp-0x04], eax
       mov      rcx, 0x1DE006026C0
       call     [System.Nullable:GetUnderlyingType(System.Type):System.Type]
       test     rax, rax
       je       SHORT G_M000_IG05
       mov      rdx, qword ptr [rbp+0x18]
       mov      rcx, 0x7FFCFAE43FF8
       call     [CORINFO_HELP_BOX]
       test     rax, rax
       setne    al
       movzx    eax, al
       mov      dword ptr [rbp-0x20], eax
       jmp      SHORT G_M000_IG06
 
G_M000_IG05:                ;; offset=0x009D
       mov      dword ptr [rbp-0x20], 1
 
G_M000_IG06:                ;; offset=0x00A4
       movzx    eax, byte  ptr [rbp-0x20]
       mov      dword ptr [rbp-0x08], eax
       mov      eax, dword ptr [rbp-0x04]
       cmp      eax, dword ptr [rbp-0x08]
       je       SHORT G_M000_IG08
       mov      eax, 1
 
G_M000_IG07:                ;; offset=0x00B8
       add      rsp, 80
       pop      rbp
       ret      
 
G_M000_IG08:                ;; offset=0x00BE
       cmp      dword ptr [rbp-0x04], 0
       je       SHORT G_M000_IG11
       mov      rax, 0x1DE006026C0
       mov      gword ptr [rbp-0x10], rax
       mov      rax, 0x1DE006026C0
       mov      gword ptr [rbp-0x18], rax
       mov      rax, gword ptr [rbp-0x10]
       cmp      rax, qword ptr [rbp-0x18]
       jne      SHORT G_M000_IG09
       mov      rcx, gword ptr [rbp-0x10]
       call     [Microsoft.AspNetCore.Components.ChangeDetection:IsKnownImmutableType(System.Type):bool]
       test     eax, eax
       je       SHORT G_M000_IG09
       mov      rdx, qword ptr [rbp+0x18]
       mov      rcx, 0x7FFCFAE43FF8
       call     [CORINFO_HELP_BOX]
       mov      gword ptr [rbp-0x28], rax
       mov      rdx, gword ptr [rbp-0x28]
       mov      rcx, qword ptr [rbp+0x10]
       call     [System.Guid:Equals(System.Object):bool:this]
       test     eax, eax
       jne      SHORT G_M000_IG11
 
G_M000_IG09:                ;; offset=0x0122
       mov      eax, 1
 
G_M000_IG10:                ;; offset=0x0127
       add      rsp, 80
       pop      rbp
       ret      
 
G_M000_IG11:                ;; offset=0x012D
       xor      eax, eax
 
G_M000_IG12:                ;; offset=0x012F
       add      rsp, 80
       pop      rbp
       ret      
 
; Total bytes of code 309 for method Microsoft.AspNetCore.Components.ChangeDetection:MayHaveChanged[System.Guid,System.Guid](System.Guid,System.Guid):bool (Tier0)

; Assembly listing for method Microsoft.AspNetCore.Components.ChangeDetection:MayHaveChanged[System.DateOnly,System.DateOnly](System.DateOnly,System.DateOnly):bool (Tier0)
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
       mov      dword ptr [rbp+0x10], ecx
       mov      dword ptr [rbp+0x18], edx
 
G_M000_IG02:                ;; offset=0x001F
       mov      rcx, 0x1DE006053D0
       call     [System.Nullable:GetUnderlyingType(System.Type):System.Type]
       test     rax, rax
       je       SHORT G_M000_IG03
       lea      rdx, [rbp+0x10]
       mov      rcx, 0x7FFCFB052190
       call     [CORINFO_HELP_BOX]
       test     rax, rax
       setne    al
       movzx    eax, al
       mov      dword ptr [rbp-0x1C], eax
       jmp      SHORT G_M000_IG04
 
G_M000_IG03:                ;; offset=0x0056
       mov      dword ptr [rbp-0x1C], 1
 
G_M000_IG04:                ;; offset=0x005D
       movzx    eax, byte  ptr [rbp-0x1C]
       mov      dword ptr [rbp-0x04], eax
       mov      rcx, 0x1DE006053D0
       call     [System.Nullable:GetUnderlyingType(System.Type):System.Type]
       test     rax, rax
       je       SHORT G_M000_IG05
       lea      rdx, [rbp+0x18]
       mov      rcx, 0x7FFCFB052190
       call     [CORINFO_HELP_BOX]
       test     rax, rax
       setne    al
       movzx    eax, al
       mov      dword ptr [rbp-0x20], eax
       jmp      SHORT G_M000_IG06
 
G_M000_IG05:                ;; offset=0x009B
       mov      dword ptr [rbp-0x20], 1
 
G_M000_IG06:                ;; offset=0x00A2
       movzx    eax, byte  ptr [rbp-0x20]
       mov      dword ptr [rbp-0x08], eax
       mov      eax, dword ptr [rbp-0x04]
       cmp      eax, dword ptr [rbp-0x08]
       je       SHORT G_M000_IG08
       mov      eax, 1
 
G_M000_IG07:                ;; offset=0x00B6
       add      rsp, 80
       pop      rbp
       ret      
 
G_M000_IG08:                ;; offset=0x00BC
       cmp      dword ptr [rbp-0x04], 0
       je       SHORT G_M000_IG11
       mov      rax, 0x1DE006053D0
       mov      gword ptr [rbp-0x10], rax
       mov      rax, 0x1DE006053D0
       mov      gword ptr [rbp-0x18], rax
       mov      rax, gword ptr [rbp-0x10]
       cmp      rax, qword ptr [rbp-0x18]
       jne      SHORT G_M000_IG09
       mov      rcx, gword ptr [rbp-0x10]
       call     [Microsoft.AspNetCore.Components.ChangeDetection:IsKnownImmutableType(System.Type):bool]
       test     eax, eax
       je       SHORT G_M000_IG09
       lea      rdx, [rbp+0x18]
       mov      rcx, 0x7FFCFB052190
       call     [CORINFO_HELP_BOX]
       mov      gword ptr [rbp-0x28], rax
       mov      rdx, gword ptr [rbp-0x28]
       lea      rcx, [rbp+0x10]
       call     [System.DateOnly:Equals(System.Object):bool:this]
       test     eax, eax
       jne      SHORT G_M000_IG11
 
G_M000_IG09:                ;; offset=0x0120
       mov      eax, 1
 
G_M000_IG10:                ;; offset=0x0125
       add      rsp, 80
       pop      rbp
       ret      
 
G_M000_IG11:                ;; offset=0x012B
       xor      eax, eax
 
G_M000_IG12:                ;; offset=0x012D
       add      rsp, 80
       pop      rbp
       ret      
 
; Total bytes of code 307 for method Microsoft.AspNetCore.Components.ChangeDetection:MayHaveChanged[System.DateOnly,System.DateOnly](System.DateOnly,System.DateOnly):bool (Tier0)

; Assembly listing for method Microsoft.AspNetCore.Components.ChangeDetection:MayHaveChanged[System.TimeOnly,System.TimeOnly](System.TimeOnly,System.TimeOnly):bool (Tier0)
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
       mov      rcx, 0x1DE00605420
       call     [System.Nullable:GetUnderlyingType(System.Type):System.Type]
       test     rax, rax
       je       SHORT G_M000_IG03
       lea      rdx, [rbp+0x10]
       mov      rcx, 0x7FFCFB053DC0
       call     [CORINFO_HELP_BOX]
       test     rax, rax
       setne    al
       movzx    eax, al
       mov      dword ptr [rbp-0x1C], eax
       jmp      SHORT G_M000_IG04
 
G_M000_IG03:                ;; offset=0x0058
       mov      dword ptr [rbp-0x1C], 1
 
G_M000_IG04:                ;; offset=0x005F
       movzx    eax, byte  ptr [rbp-0x1C]
       mov      dword ptr [rbp-0x04], eax
       mov      rcx, 0x1DE00605420
       call     [System.Nullable:GetUnderlyingType(System.Type):System.Type]
       test     rax, rax
       je       SHORT G_M000_IG05
       lea      rdx, [rbp+0x18]
       mov      rcx, 0x7FFCFB053DC0
       call     [CORINFO_HELP_BOX]
       test     rax, rax
       setne    al
       movzx    eax, al
       mov      dword ptr [rbp-0x20], eax
       jmp      SHORT G_M000_IG06
 
G_M000_IG05:                ;; offset=0x009D
       mov      dword ptr [rbp-0x20], 1
 
G_M000_IG06:                ;; offset=0x00A4
       movzx    eax, byte  ptr [rbp-0x20]
       mov      dword ptr [rbp-0x08], eax
       mov      eax, dword ptr [rbp-0x04]
       cmp      eax, dword ptr [rbp-0x08]
       je       SHORT G_M000_IG08
       mov      eax, 1
 
G_M000_IG07:                ;; offset=0x00B8
       add      rsp, 80
       pop      rbp
       ret      
 
G_M000_IG08:                ;; offset=0x00BE
       cmp      dword ptr [rbp-0x04], 0
       je       SHORT G_M000_IG11
       mov      rax, 0x1DE00605420
       mov      gword ptr [rbp-0x10], rax
       mov      rax, 0x1DE00605420
       mov      gword ptr [rbp-0x18], rax
       mov      rax, gword ptr [rbp-0x10]
       cmp      rax, qword ptr [rbp-0x18]
       jne      SHORT G_M000_IG09
       mov      rcx, gword ptr [rbp-0x10]
       call     [Microsoft.AspNetCore.Components.ChangeDetection:IsKnownImmutableType(System.Type):bool]
       test     eax, eax
       je       SHORT G_M000_IG09
       lea      rdx, [rbp+0x18]
       mov      rcx, 0x7FFCFB053DC0
       call     [CORINFO_HELP_BOX]
       mov      gword ptr [rbp-0x28], rax
       mov      rdx, gword ptr [rbp-0x28]
       lea      rcx, [rbp+0x10]
       call     [System.TimeOnly:Equals(System.Object):bool:this]
       test     eax, eax
       jne      SHORT G_M000_IG11
 
G_M000_IG09:                ;; offset=0x0122
       mov      eax, 1
 
G_M000_IG10:                ;; offset=0x0127
       add      rsp, 80
       pop      rbp
       ret      
 
G_M000_IG11:                ;; offset=0x012D
       xor      eax, eax
 
G_M000_IG12:                ;; offset=0x012F
       add      rsp, 80
       pop      rbp
       ret      
 
; Total bytes of code 309 for method Microsoft.AspNetCore.Components.ChangeDetection:MayHaveChanged[System.TimeOnly,System.TimeOnly](System.TimeOnly,System.TimeOnly):bool (Tier0)

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
       vxorps   xmm4, xmm4, xmm4
       vmovdqu32 zmmword ptr [rbp-0x40], zmm4
       mov      dword ptr [rbp+0x10], ecx
       mov      dword ptr [rbp+0x18], edx
 
G_M000_IG02:                ;; offset=0x001B
       mov      rcx, 0x1DE0060B108
       call     [System.Nullable:GetUnderlyingType(System.Type):System.Type]
       test     rax, rax
       je       SHORT G_M000_IG03
       mov      rcx, 0x7FFCFB16F0E0
       call     CORINFO_HELP_NEWSFAST
       mov      gword ptr [rbp-0x40], rax
       mov      rax, gword ptr [rbp-0x40]
       mov      ecx, dword ptr [rbp+0x10]
       mov      dword ptr [rax+0x08], ecx
       cmp      qword ptr [rbp-0x40], 0
       setne    al
       movzx    eax, al
       mov      dword ptr [rbp-0x1C], eax
       jmp      SHORT G_M000_IG04
 
G_M000_IG03:                ;; offset=0x005D
       mov      dword ptr [rbp-0x1C], 1
 
G_M000_IG04:                ;; offset=0x0064
       movzx    eax, byte  ptr [rbp-0x1C]
       mov      dword ptr [rbp-0x04], eax
       mov      rcx, 0x1DE0060B108
       call     [System.Nullable:GetUnderlyingType(System.Type):System.Type]
       test     rax, rax
       je       SHORT G_M000_IG05
       mov      rcx, 0x7FFCFB16F0E0
       call     CORINFO_HELP_NEWSFAST
       mov      gword ptr [rbp-0x38], rax
       mov      rax, gword ptr [rbp-0x38]
       mov      ecx, dword ptr [rbp+0x18]
       mov      dword ptr [rax+0x08], ecx
       cmp      qword ptr [rbp-0x38], 0
       setne    al
       movzx    eax, al
       mov      dword ptr [rbp-0x20], eax
       jmp      SHORT G_M000_IG06
 
G_M000_IG05:                ;; offset=0x00AD
       mov      dword ptr [rbp-0x20], 1
 
G_M000_IG06:                ;; offset=0x00B4
       movzx    eax, byte  ptr [rbp-0x20]
       mov      dword ptr [rbp-0x08], eax
       mov      eax, dword ptr [rbp-0x04]
       cmp      eax, dword ptr [rbp-0x08]
       je       SHORT G_M000_IG08
       mov      eax, 1
 
G_M000_IG07:                ;; offset=0x00C8
       add      rsp, 96
       pop      rbp
       ret      
 
G_M000_IG08:                ;; offset=0x00CE
       cmp      dword ptr [rbp-0x04], 0
       je       G_M000_IG11
       mov      rax, 0x1DE0060B108
       mov      gword ptr [rbp-0x10], rax
       mov      rax, 0x1DE0060B108
       mov      gword ptr [rbp-0x18], rax
       mov      rax, gword ptr [rbp-0x10]
       cmp      rax, qword ptr [rbp-0x18]
       jne      SHORT G_M000_IG09
       mov      rcx, gword ptr [rbp-0x10]
       call     [Microsoft.AspNetCore.Components.ChangeDetection:IsKnownImmutableType(System.Type):bool]
       test     eax, eax
       je       SHORT G_M000_IG09
       mov      rcx, 0x7FFCFB16F0E0
       call     CORINFO_HELP_NEWSFAST
       mov      gword ptr [rbp-0x28], rax
       mov      rax, gword ptr [rbp-0x28]
       mov      ecx, dword ptr [rbp+0x18]
       mov      dword ptr [rax+0x08], ecx
       mov      rcx, 0x7FFCFB16F0E0
       call     CORINFO_HELP_NEWSFAST
       mov      gword ptr [rbp-0x30], rax
       mov      rax, gword ptr [rbp-0x30]
       mov      ecx, dword ptr [rbp+0x10]
       mov      dword ptr [rax+0x08], ecx
       mov      rdx, gword ptr [rbp-0x28]
       mov      rcx, gword ptr [rbp-0x30]
       mov      rax, gword ptr [rbp-0x30]
       mov      rax, qword ptr [rax]
       mov      rax, qword ptr [rax+0x40]
       call     [rax+0x10]System.Object:Equals(System.Object):bool:this
       test     eax, eax
       jne      SHORT G_M000_IG11
 
G_M000_IG09:                ;; offset=0x0160
       mov      eax, 1
 
G_M000_IG10:                ;; offset=0x0165
       add      rsp, 96
       pop      rbp
       ret      
 
G_M000_IG11:                ;; offset=0x016B
       xor      eax, eax
 
G_M000_IG12:                ;; offset=0x016D
       add      rsp, 96
       pop      rbp
       ret      
 
; Total bytes of code 371 for method Microsoft.AspNetCore.Components.ChangeDetection:MayHaveChanged[int,int](int,int):bool (Tier0)

; Assembly listing for method Microsoft.AspNetCore.Components.ChangeDetection:MayHaveChanged[System.Nullable`1[int],System.Nullable`1[int]](System.Nullable`1[int],System.Nullable`1[int]):bool (Tier0)
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
       mov      rcx, 0x1DE0060B430
       call     [System.Nullable:GetUnderlyingType(System.Type):System.Type]
       test     rax, rax
       je       SHORT G_M000_IG03
       movzx    eax, byte  ptr [rbp+0x10]
       test     eax, eax
       setne    al
       movzx    eax, al
       mov      dword ptr [rbp-0x1C], eax
       jmp      SHORT G_M000_IG04
 
G_M000_IG03:                ;; offset=0x0047
       mov      dword ptr [rbp-0x1C], 1
 
G_M000_IG04:                ;; offset=0x004E
       movzx    eax, byte  ptr [rbp-0x1C]
       mov      dword ptr [rbp-0x04], eax
       mov      rcx, 0x1DE0060B430
       call     [System.Nullable:GetUnderlyingType(System.Type):System.Type]
       test     rax, rax
       je       SHORT G_M000_IG05
       movzx    eax, byte  ptr [rbp+0x18]
       test     eax, eax
       setne    al
       movzx    eax, al
       mov      dword ptr [rbp-0x20], eax
       jmp      SHORT G_M000_IG06
 
G_M000_IG05:                ;; offset=0x007B
       mov      dword ptr [rbp-0x20], 1
 
G_M000_IG06:                ;; offset=0x0082
       movzx    eax, byte  ptr [rbp-0x20]
       mov      dword ptr [rbp-0x08], eax
       mov      eax, dword ptr [rbp-0x04]
       cmp      eax, dword ptr [rbp-0x08]
       je       SHORT G_M000_IG08
       mov      eax, 1
 
G_M000_IG07:                ;; offset=0x0096
       add      rsp, 80
       pop      rbp
       ret      
 
G_M000_IG08:                ;; offset=0x009C
       cmp      dword ptr [rbp-0x04], 0
       je       G_M000_IG11
       lea      rdx, [rbp+0x10]
       mov      rcx, 0x7FFCFADB6DD8
       call     [CORINFO_HELP_BOX_NULLABLE]
       mov      rcx, rax
       call     [System.Object:GetType():System.Type:this]
       mov      gword ptr [rbp-0x10], rax
       lea      rdx, [rbp+0x18]
       mov      rcx, 0x7FFCFADB6DD8
       call     [CORINFO_HELP_BOX_NULLABLE]
       mov      rcx, rax
       call     [System.Object:GetType():System.Type:this]
       mov      gword ptr [rbp-0x18], rax
       mov      rcx, gword ptr [rbp-0x10]
       mov      rdx, gword ptr [rbp-0x18]
       call     [System.Type:op_Inequality(System.Type,System.Type):bool]
       test     eax, eax
       jne      SHORT G_M000_IG09
       mov      rcx, gword ptr [rbp-0x10]
       call     [Microsoft.AspNetCore.Components.ChangeDetection:IsKnownImmutableType(System.Type):bool]
       test     eax, eax
       je       SHORT G_M000_IG09
       lea      rdx, [rbp+0x18]
       mov      rcx, 0x7FFCFADB6DD8
       call     [CORINFO_HELP_BOX_NULLABLE]
       mov      gword ptr [rbp-0x28], rax
       mov      rdx, gword ptr [rbp-0x28]
       lea      rcx, [rbp+0x10]
       call     [System.Nullable`1[int]:Equals(System.Object):bool:this]
       test     eax, eax
       jne      SHORT G_M000_IG11
 
G_M000_IG09:                ;; offset=0x0132
       mov      eax, 1
 
G_M000_IG10:                ;; offset=0x0137
       add      rsp, 80
       pop      rbp
       ret      
 
G_M000_IG11:                ;; offset=0x013D
       xor      eax, eax
 
G_M000_IG12:                ;; offset=0x013F
       add      rsp, 80
       pop      rbp
       ret      
 
; Total bytes of code 325 for method Microsoft.AspNetCore.Components.ChangeDetection:MayHaveChanged[System.Nullable`1[int],System.Nullable`1[int]](System.Nullable`1[int],System.Nullable`1[int]):bool (Tier0)

; Assembly listing for method Microsoft.AspNetCore.Components.ChangeDetection:MayHaveChanged[System.__Canon,System.__Canon](System.__Canon,System.__Canon):bool (Tier0)
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
       vmovdqa  xmmword ptr [rbp-0x20], xmm4
       mov      qword ptr [rbp-0x10], rax
       mov      qword ptr [rbp-0x08], rcx
       mov      qword ptr [rbp+0x10], rcx
       mov      gword ptr [rbp+0x18], rdx
       mov      gword ptr [rbp+0x20], r8
 
G_M000_IG02:                ;; offset=0x002D
       cmp      qword ptr [rbp+0x18], 0
       setne    al
       movzx    eax, al
       mov      dword ptr [rbp-0x24], eax
       movzx    eax, byte  ptr [rbp-0x24]
       mov      dword ptr [rbp-0x0C], eax
       cmp      qword ptr [rbp+0x20], 0
       setne    al
       movzx    eax, al
       mov      dword ptr [rbp-0x28], eax
       movzx    eax, byte  ptr [rbp-0x28]
       mov      dword ptr [rbp-0x10], eax
       mov      eax, dword ptr [rbp-0x0C]
       cmp      eax, dword ptr [rbp-0x10]
       je       SHORT G_M000_IG04
       mov      eax, 1
 
G_M000_IG03:                ;; offset=0x0064
       add      rsp, 80
       pop      rbp
       ret      
 
G_M000_IG04:                ;; offset=0x006A
       cmp      dword ptr [rbp-0x0C], 0
       je       SHORT G_M000_IG07
       mov      rcx, gword ptr [rbp+0x18]
       call     [System.Object:GetType():System.Type:this]
       mov      gword ptr [rbp-0x18], rax
       mov      rcx, gword ptr [rbp+0x20]
       call     [System.Object:GetType():System.Type:this]
       mov      gword ptr [rbp-0x20], rax
       mov      rcx, gword ptr [rbp-0x18]
       mov      rdx, gword ptr [rbp-0x20]
       call     [System.Type:op_Inequality(System.Type,System.Type):bool]
       test     eax, eax
       jne      SHORT G_M000_IG05
       mov      rcx, gword ptr [rbp-0x18]
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
 
G_M000_IG05:                ;; offset=0x00C6
       mov      eax, 1
 
G_M000_IG06:                ;; offset=0x00CB
       add      rsp, 80
       pop      rbp
       ret      
 
G_M000_IG07:                ;; offset=0x00D1
       xor      eax, eax
 
G_M000_IG08:                ;; offset=0x00D3
       add      rsp, 80
       pop      rbp
       ret      
 
; Total bytes of code 217 for method Microsoft.AspNetCore.Components.ChangeDetection:MayHaveChanged[System.__Canon,System.__Canon](System.__Canon,System.__Canon):bool (Tier0)

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
       vxorps   xmm4, xmm4, xmm4
       vmovdqu  ymmword ptr [rbp-0x30], ymm4
       vmovdqa  xmmword ptr [rbp-0x10], xmm4
       mov      qword ptr [rbp+0x10], rcx
       mov      qword ptr [rbp+0x18], rdx
 
G_M000_IG02:                ;; offset=0x0020
       mov      rcx, 0x1DE0060B9C8
       call     [System.Nullable:GetUnderlyingType(System.Type):System.Type]
       test     rax, rax
       je       SHORT G_M000_IG03
       mov      rdx, qword ptr [rbp+0x10]
       mov      rcx, 0x7FFCFB16E028
       call     [CORINFO_HELP_BOX]
       test     rax, rax
       setne    al
       movzx    eax, al
       mov      dword ptr [rbp-0x1C], eax
       jmp      SHORT G_M000_IG04
 
G_M000_IG03:                ;; offset=0x0057
       mov      dword ptr [rbp-0x1C], 1
 
G_M000_IG04:                ;; offset=0x005E
       movzx    eax, byte  ptr [rbp-0x1C]
       mov      dword ptr [rbp-0x04], eax
       mov      rcx, 0x1DE0060B9C8
       call     [System.Nullable:GetUnderlyingType(System.Type):System.Type]
       test     rax, rax
       je       SHORT G_M000_IG05
       mov      rdx, qword ptr [rbp+0x18]
       mov      rcx, 0x7FFCFB16E028
       call     [CORINFO_HELP_BOX]
       test     rax, rax
       setne    al
       movzx    eax, al
       mov      dword ptr [rbp-0x20], eax
       jmp      SHORT G_M000_IG06
 
G_M000_IG05:                ;; offset=0x009C
       mov      dword ptr [rbp-0x20], 1
 
G_M000_IG06:                ;; offset=0x00A3
       movzx    eax, byte  ptr [rbp-0x20]
       mov      dword ptr [rbp-0x08], eax
       mov      eax, dword ptr [rbp-0x04]
       cmp      eax, dword ptr [rbp-0x08]
       je       SHORT G_M000_IG08
       mov      eax, 1
 
G_M000_IG07:                ;; offset=0x00B7
       add      rsp, 80
       pop      rbp
       ret      
 
G_M000_IG08:                ;; offset=0x00BD
       cmp      dword ptr [rbp-0x04], 0
       je       G_M000_IG11
       mov      rax, 0x1DE0060B9C8
       mov      gword ptr [rbp-0x10], rax
       mov      rax, 0x1DE0060B9C8
       mov      gword ptr [rbp-0x18], rax
       mov      rax, gword ptr [rbp-0x10]
       cmp      rax, qword ptr [rbp-0x18]
       jne      SHORT G_M000_IG09
       mov      rcx, gword ptr [rbp-0x10]
       call     [Microsoft.AspNetCore.Components.ChangeDetection:IsKnownImmutableType(System.Type):bool]
       test     eax, eax
       je       SHORT G_M000_IG09
       mov      rdx, qword ptr [rbp+0x18]
       mov      rcx, 0x7FFCFB16E028
       call     [CORINFO_HELP_BOX]
       mov      gword ptr [rbp-0x28], rax
       mov      rdx, qword ptr [rbp+0x10]
       mov      rcx, 0x7FFCFB16E028
       call     [CORINFO_HELP_BOX]
       mov      gword ptr [rbp-0x30], rax
       mov      rcx, gword ptr [rbp-0x30]
       mov      rdx, gword ptr [rbp-0x28]
       mov      rax, gword ptr [rbp-0x30]
       mov      rax, qword ptr [rax]
       mov      rax, qword ptr [rax+0x40]
       call     [rax+0x10]System.Object:Equals(System.Object):bool:this
       test     eax, eax
       jne      SHORT G_M000_IG11
 
G_M000_IG09:                ;; offset=0x0145
       mov      eax, 1
 
G_M000_IG10:                ;; offset=0x014A
       add      rsp, 80
       pop      rbp
       ret      
 
G_M000_IG11:                ;; offset=0x0150
       xor      eax, eax
 
G_M000_IG12:                ;; offset=0x0152
       add      rsp, 80
       pop      rbp
       ret      
 
; Total bytes of code 344 for method Microsoft.AspNetCore.Components.ChangeDetection:MayHaveChanged[AutoPerf.WideValue,AutoPerf.WideValue](AutoPerf.WideValue,AutoPerf.WideValue):bool (Tier0)

; Assembly listing for method Microsoft.AspNetCore.Components.ChangeDetection:MayHaveChanged[int,System.__Canon](int,System.__Canon):bool (Tier0)
; Emitting BLENDED_CODE for x64 + VEX + EVEX on Windows
; Tier0 code
; rbp based frame
; partially interruptible
; compiling with minopt

G_M000_IG01:                ;; offset=0x0000
       push     rbp
       sub      rsp, 80
       lea      rbp, [rsp+0x50]
       vxorps   xmm4, xmm4, xmm4
       vmovdqu  ymmword ptr [rbp-0x30], ymm4
       xor      eax, eax
       mov      qword ptr [rbp-0x10], rax
       mov      qword ptr [rbp-0x08], rcx
       mov      qword ptr [rbp+0x10], rcx
       mov      dword ptr [rbp+0x18], edx
       mov      gword ptr [rbp+0x20], r8
 
G_M000_IG02:                ;; offset=0x0028
       mov      rcx, 0x1DE006018A8
       call     [System.Nullable:GetUnderlyingType(System.Type):System.Type]
       test     rax, rax
       je       SHORT G_M000_IG03
       mov      rcx, 0x7FFCFAD68448
       call     CORINFO_HELP_NEWSFAST
       mov      gword ptr [rbp-0x30], rax
       mov      rax, gword ptr [rbp-0x30]
       mov      ecx, dword ptr [rbp+0x18]
       mov      dword ptr [rax+0x08], ecx
       cmp      qword ptr [rbp-0x30], 0
       setne    al
       movzx    eax, al
       mov      dword ptr [rbp-0x24], eax
       jmp      SHORT G_M000_IG04
 
G_M000_IG03:                ;; offset=0x006A
       mov      dword ptr [rbp-0x24], 1
 
G_M000_IG04:                ;; offset=0x0071
       movzx    eax, byte  ptr [rbp-0x24]
       mov      dword ptr [rbp-0x0C], eax
       cmp      qword ptr [rbp+0x20], 0
       setne    al
       movzx    eax, al
       mov      dword ptr [rbp-0x28], eax
       movzx    eax, byte  ptr [rbp-0x28]
       mov      dword ptr [rbp-0x10], eax
       mov      eax, dword ptr [rbp-0x0C]
       cmp      eax, dword ptr [rbp-0x10]
       je       SHORT G_M000_IG06
       mov      eax, 1
 
G_M000_IG05:                ;; offset=0x009A
       add      rsp, 80
       pop      rbp
       ret      
 
G_M000_IG06:                ;; offset=0x00A0
       cmp      dword ptr [rbp-0x0C], 0
       je       SHORT G_M000_IG09
       mov      rax, 0x1DE006018A8
       mov      gword ptr [rbp-0x18], rax
       mov      rcx, gword ptr [rbp+0x20]
       call     [System.Object:GetType():System.Type:this]
       mov      gword ptr [rbp-0x20], rax
       mov      rax, gword ptr [rbp-0x18]
       cmp      rax, qword ptr [rbp-0x20]
       jne      SHORT G_M000_IG07
       mov      rcx, gword ptr [rbp-0x18]
       call     [Microsoft.AspNetCore.Components.ChangeDetection:IsKnownImmutableType(System.Type):bool]
       test     eax, eax
       je       SHORT G_M000_IG07
       lea      rcx, [rbp+0x18]
       mov      rdx, gword ptr [rbp+0x20]
       call     [System.Int32:Equals(System.Object):bool:this]
       test     eax, eax
       jne      SHORT G_M000_IG09
 
G_M000_IG07:                ;; offset=0x00EC
       mov      eax, 1
 
G_M000_IG08:                ;; offset=0x00F1
       add      rsp, 80
       pop      rbp
       ret      
 
G_M000_IG09:                ;; offset=0x00F7
       xor      eax, eax
 
G_M000_IG10:                ;; offset=0x00F9
       add      rsp, 80
       pop      rbp
       ret      
 
; Total bytes of code 255 for method Microsoft.AspNetCore.Components.ChangeDetection:MayHaveChanged[int,System.__Canon](int,System.__Canon):bool (Tier0)

