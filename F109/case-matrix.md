# F109 declared owning-path matrix

Recorded before any shipping change or benchmark profile.33 explicit synthetic profiles,not measured production frequencies. All timed calls use actual UserManager.VerifyUserTokenAsync/registered DataProtectorTokenProvider/real persisted public Data Protection and an explicit synchronous in-memory user store.

The initial fixture failed before any probe/profile because its assumed valid nonzero-unused-pad-bit token was actually rejected by the pinned original Convert decoder. That exact failure,initial32-case matrix/compiled-source identities and isolated private keys are retained in development/failed-unused-pad-bit-fixture. The corrected matrix explicitly separates the actual canonical ValidPadded control from InvalidUnusedPadBits;this was not a measured source comparison.

| Profiles | Producer/input and expected material effect |
|---|---|
| ValidSmall,ValidLarge | Actual public GenerateUserTokenAsync;16/8192 repeated user-ID characters plus fixed synthetic prefix. True,one real Unprotect,one ID and one stamp read,no failure logs. |
| ValidWhitespace,ValidLargeWhitespace | Accepted ASCII space/tab/CR/LF inserted every16 generated Base64 characters. Same complete true outcome/reads. |
| ValidNoStamp | Actual public generation with a store without stamp support. True,one Unprotect/ID read,no stamp read. |
| ValidPadded,InvalidUnusedPadBits | Actual generated padded token found with at most64 declared synthetic ID suffixes. Canonical spelling validates true with complete reads;changing one unused pad bit reaches actual pinned Convert rejection,false/zero downstream calls/original1 candidate0 FormatException. |
| ValidEnabled | Same valid small token,Debug enabled/no-op timed sink. True,no failure logs. |
| InvalidHeadSmall,InvalidMiddleSmall,InvalidTailSmall | Replace declared generated Base64 character with exclamation. False,zero real Unprotect/ID/stamp reads. Original actual Convert FormatException1;candidate target0. |
| InvalidLengthSmall,InvalidPaddingSmall,InvalidNonAsciiSmall | Remove final character,replace interior character with padding,or replace with U+00A0. Same malformed-Base64 expectations. |
| InvalidHeadLarge,InvalidTailLarge,InvalidLengthLarge | Declared corresponding mutations of actual generated large token. Same zero downstream calls and original1/candidate0 decoder FormatException. |
| InvalidHeadEnabled,InvalidTailEnabled,InvalidPaddingEnabled | Same small malformed bytes with Debug enabled/no-op timed sink. Complete false result;provider event6/UnhandledException and manager event9/VerifyUserTokenFailed. |
| Empty,WhitespaceOnly | Explicit caller text decoding to empty bytes. Real Unprotect1,ID/stamp0,false;existing exception handling remains. |
| NullOutsideAnnotation | Explicit null outside public non-null annotation. Original ArgumentNullException decoder/catch behavior retained;Unprotect/ID/stamp0,false. |
| UnprotectFailure | Last decoded protected byte of actual generated token changed,then actual Base64 re-encoded. Real Unprotect1,ID/stamp0,false;not a Base64-preflight optimization. |
| ProtectedTruncated | Actual public protection of empty parser payload. Unprotect1,ID/stamp0,false;real reader failure remains. |
| ProtectedTrailing | Actual generated payload plus one trailing ASCII byte,then real public protection. Unprotect/ID1,stamp0,false,event3. |
| ProtectedInvalidUtf8 | Explicit UTC-ticks/one-byte malformed UTF8 user-ID payload through real public protection. Unprotect1,ID/stamp0,false;actual decoder failure remains. |
| ProtectedMalformedLengthPrefix | Explicit UTC-ticks/five-FF 7-bit string-length payload through real public protection. Unprotect1,ID/stamp0,false;actual reader FormatException1 remains,not mislabeled as removed Base64 cost. |
| WrongPurpose,WrongUser,WrongStamp | Actual generated token with declared different caller/store field. False,Unprotect1;purpose/user consumeID1/stamp0,stamp consumesID1/stamp1. Events2/1/4 respectively. |
| Expired | Actual generated token with explicit configured negative one-day lifespan,not sleep or wall-clock race. False,Unprotect1,ID/stamp0,event0. |
| NonEmptyStampWithoutStore | Actual stamped token validated by explicit store without stamp support. False,Unprotect/ID1,stamp0,event5. |

Every setup/probe records two complete runs:configured logger mode,and forced Debug-enabled semantic observation. Observe exact result/calls/exception type counts/provider and manager event ID/name/message/ordered structured fields/null exception state. First-chance observers and detailed log formatting are removed before timing;the enabled timed sink intentionally performs no formatting or I/O. No logging-storage/HTTP/external-store/native-allocation claim.

Original/candidate processes share one generated synthetic fixture's exact input bytes and isolated key bytes. Private key bytes stay local;published hashes/receipts are not a portable rehash of omitted keys. Fresh reproduction regenerates a shared fixture for both variants;original generated inputs have the shipped one-day lifetime,so expired historical inputs cannot verify the valid path. Setup assertions must fail rather than silently benchmarking an expired or incomplete path.

Independent calipers use5samples/case,8192 complete operations/sample after2048 warmups,actual precise process-wide allocation and enclosing actual BDN GC helper counters. They are not another source comparison or pure decoder/native-footprint attribution.
