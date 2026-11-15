; Assembly listing for method Microsoft.Net.Http.Headers.ObjectCollection`1[int]:CheckNotNull(int) (Tier0)
; Emitting BLENDED_CODE for x64 + VEX + EVEX on Windows
; Tier0 code
; rbp based frame
; partially interruptible
; compiling with minopt

G_M000_IG01:                ;; offset=0x0000
       push     rbp
       sub      rsp, 32
       lea      rbp, [rsp+0x20]
       mov      dword ptr [rbp+0x10], ecx
 
G_M000_IG02:                ;; offset=0x000D
       mov      rcx, 0x281807018A8
       call     [System.Nullable:GetUnderlyingType(System.Type):System.Type]
       test     rax, rax
       je       SHORT G_M000_IG03
 
G_M000_IG03:                ;; offset=0x0022
       add      rsp, 32
       pop      rbp
       ret      
 
; Total bytes of code 40 for method Microsoft.Net.Http.Headers.ObjectCollection`1[int]:CheckNotNull(int) (Tier0)

; Assembly listing for method Microsoft.Net.Http.Headers.ObjectCollection`1[Microsoft.Extensions.Primitives.StringSegment]:CheckNotNull(Microsoft.Extensions.Primitives.StringSegment) (Tier0)
; Emitting BLENDED_CODE for x64 + VEX + EVEX on Windows
; Tier0 code
; rbp based frame
; partially interruptible
; compiling with minopt

G_M000_IG01:                ;; offset=0x0000
       push     rbp
       sub      rsp, 32
       lea      rbp, [rsp+0x20]
       mov      qword ptr [rbp+0x10], rcx
 
G_M000_IG02:                ;; offset=0x000E
       mov      rcx, 0x281807094C0
       call     [System.Nullable:GetUnderlyingType(System.Type):System.Type]
       test     rax, rax
       je       SHORT G_M000_IG03
 
G_M000_IG03:                ;; offset=0x0023
       add      rsp, 32
       pop      rbp
       ret      
 
; Total bytes of code 41 for method Microsoft.Net.Http.Headers.ObjectCollection`1[Microsoft.Extensions.Primitives.StringSegment]:CheckNotNull(Microsoft.Extensions.Primitives.StringSegment) (Tier0)

; Assembly listing for method Microsoft.Net.Http.Headers.ObjectCollection`1[System.__Canon]:CheckNotNull(System.__Canon) (Tier0)
; Emitting BLENDED_CODE for x64 + VEX + EVEX on Windows
; Tier0 code
; rbp based frame
; partially interruptible
; compiling with minopt

G_M000_IG01:                ;; offset=0x0000
       push     rbp
       sub      rsp, 48
       lea      rbp, [rsp+0x30]
       xor      eax, eax
       mov      qword ptr [rbp-0x10], rax
       mov      qword ptr [rbp-0x08], rcx
       mov      qword ptr [rbp+0x10], rcx
       mov      gword ptr [rbp+0x18], rdx
 
G_M000_IG02:                ;; offset=0x001C
       cmp      qword ptr [rbp+0x18], 0
       jne      SHORT G_M000_IG04
 
G_M000_IG03:                ;; offset=0x0023
       mov      rcx, 0x7FFD4D27E5F8
       call     CORINFO_HELP_NEWSFAST
       mov      gword ptr [rbp-0x10], rax
       mov      rcx, gword ptr [rbp-0x10]
       mov      rdx, 0x28180708178
       call     [System.ArgumentNullException:.ctor(System.String):this]
       mov      rcx, gword ptr [rbp-0x10]
       call     CORINFO_HELP_THROW
       int3     
 
G_M000_IG04:                ;; offset=0x0054
       add      rsp, 48
       pop      rbp
       ret      
 
; Total bytes of code 90 for method Microsoft.Net.Http.Headers.ObjectCollection`1[System.__Canon]:CheckNotNull(System.__Canon) (Tier0)

; Assembly listing for method Microsoft.Net.Http.Headers.ObjectCollection`1[System.Nullable`1[int]]:CheckNotNull(System.Nullable`1[int]) (Tier0)
; Emitting BLENDED_CODE for x64 + VEX + EVEX on Windows
; Tier0 code
; rbp based frame
; partially interruptible
; compiling with minopt

G_M000_IG01:                ;; offset=0x0000
       push     rbp
       sub      rsp, 48
       lea      rbp, [rsp+0x30]
       xor      eax, eax
       mov      qword ptr [rbp-0x08], rax
       mov      qword ptr [rbp+0x10], rcx
 
G_M000_IG02:                ;; offset=0x0014
       mov      rcx, 0x28180709340
       call     [System.Nullable:GetUnderlyingType(System.Type):System.Type]
       test     rax, rax
       je       SHORT G_M000_IG04
       movzx    eax, byte  ptr [rbp+0x10]
       test     eax, eax
       jne      SHORT G_M000_IG04
 
G_M000_IG03:                ;; offset=0x0031
       mov      rcx, 0x7FFD4D27E5F8
       call     CORINFO_HELP_NEWSFAST
       mov      gword ptr [rbp-0x08], rax
       mov      rcx, gword ptr [rbp-0x08]
       mov      rdx, 0x28180708178
       call     [System.ArgumentNullException:.ctor(System.String):this]
       mov      rcx, gword ptr [rbp-0x08]
       call     CORINFO_HELP_THROW
       int3     
 
G_M000_IG04:                ;; offset=0x0062
       add      rsp, 48
       pop      rbp
       ret      
 
; Total bytes of code 104 for method Microsoft.Net.Http.Headers.ObjectCollection`1[System.Nullable`1[int]]:CheckNotNull(System.Nullable`1[int]) (Tier0)

