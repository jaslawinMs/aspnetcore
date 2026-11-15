; Assembly listing for method Microsoft.Net.Http.Headers.ObjectCollection`1[int]:CheckNotNull(int) (Tier0)
; Emitting BLENDED_CODE for x64 + VEX + EVEX on Windows
; Tier0 code
; rbp based frame
; partially interruptible
; compiling with minopt

G_M000_IG01:                ;; offset=0x0000
       push     rbp
       mov      rbp, rsp
       mov      dword ptr [rbp+0x10], ecx
 
G_M000_IG02:                ;; offset=0x0007
       pop      rbp
       ret      
 
; Total bytes of code 9 for method Microsoft.Net.Http.Headers.ObjectCollection`1[int]:CheckNotNull(int) (Tier0)

; Assembly listing for method Microsoft.Net.Http.Headers.ObjectCollection`1[Microsoft.Extensions.Primitives.StringSegment]:CheckNotNull(Microsoft.Extensions.Primitives.StringSegment) (Tier0)
; Emitting BLENDED_CODE for x64 + VEX + EVEX on Windows
; Tier0 code
; rbp based frame
; partially interruptible
; compiling with minopt

G_M000_IG01:                ;; offset=0x0000
       push     rbp
       mov      rbp, rsp
       mov      qword ptr [rbp+0x10], rcx
 
G_M000_IG02:                ;; offset=0x0008
       pop      rbp
       ret      
 
; Total bytes of code 10 for method Microsoft.Net.Http.Headers.ObjectCollection`1[Microsoft.Extensions.Primitives.StringSegment]:CheckNotNull(Microsoft.Extensions.Primitives.StringSegment) (Tier0)

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
       mov      qword ptr [rbp-0x08], rax
       mov      qword ptr [rbp+0x10], rcx
       mov      gword ptr [rbp+0x18], rdx
 
G_M000_IG02:                ;; offset=0x0018
       cmp      qword ptr [rbp+0x18], 0
       jne      SHORT G_M000_IG04
 
G_M000_IG03:                ;; offset=0x001F
       mov      rcx, 0x7FFD4D2AE5F8
       call     CORINFO_HELP_NEWSFAST
       mov      gword ptr [rbp-0x08], rax
       mov      rcx, gword ptr [rbp-0x08]
       mov      rdx, 0x2AB00608178
       call     [System.ArgumentNullException:.ctor(System.String):this]
       mov      rcx, gword ptr [rbp-0x08]
       call     CORINFO_HELP_THROW
       int3     
 
G_M000_IG04:                ;; offset=0x0050
       add      rsp, 48
       pop      rbp
       ret      
 
; Total bytes of code 86 for method Microsoft.Net.Http.Headers.ObjectCollection`1[System.__Canon]:CheckNotNull(System.__Canon) (Tier0)

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
       movzx    eax, byte  ptr [rbp+0x10]
       test     eax, eax
       jne      SHORT G_M000_IG04
 
G_M000_IG03:                ;; offset=0x001C
       mov      rcx, 0x7FFD4D2AE5F8
       call     CORINFO_HELP_NEWSFAST
       mov      gword ptr [rbp-0x08], rax
       mov      rcx, gword ptr [rbp-0x08]
       mov      rdx, 0x2AB00608178
       call     [System.ArgumentNullException:.ctor(System.String):this]
       mov      rcx, gword ptr [rbp-0x08]
       call     CORINFO_HELP_THROW
       int3     
 
G_M000_IG04:                ;; offset=0x004D
       add      rsp, 48
       pop      rbp
       ret      
 
; Total bytes of code 83 for method Microsoft.Net.Http.Headers.ObjectCollection`1[System.Nullable`1[int]]:CheckNotNull(System.Nullable`1[int]) (Tier0)

