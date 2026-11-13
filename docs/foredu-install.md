# Foredu 공통 계정 / NAS 재설치

이 구성은 새 설치용입니다. 기존 회원 DB를 자동 이전하거나 같은 이메일의 예전 기록을 새 사용자에게 연결하지 않습니다. 기존 데이터가 있으면 먼저 별도 복구 계획이 필요합니다.

## 현재 검증 범위

계정 게이트웨이의 요청·권한 처리는 로컬 모의 GoTrue 테스트로 검증합니다. Docker가 없는 개발 PC에서는 PostgreSQL/GoTrue 실제 기동, Gmail 발송, NAS 권한, DNS/인증서, 세 사이트 통합 로그인을 검증할 수 없습니다. NAS 기동 및 아래 수동 확인 전에는 학생에게 공개하지 마세요. 문학·문법 코드는 아직 변경하지 않았습니다.

## 구성

- `/volume2/webapps/accounts/source`: 이 저장소의 `deploy/accounts`에서 복사한 공통 계정 서비스 코드. 직접 편집하지 않습니다.
- `/volume2/webapps/accounts/data`: PostgreSQL 회원 데이터. 일반 공유 폴더 사용자에게 접근을 허용하지 마세요.
- `/volume2/webapps/accounts/.env`: DB/JWT 비밀값, Gmail SMTP 앱 비밀번호, 교사 이메일 목록. root 전용, Git 외부. 전체 내용을 출력하거나 스크린샷으로 보내지 마세요.
- `/volume2/webapps/careerfolio/source`: GitHub 저장소.
- `/volume2/webapps/careerfolio/data`: D1 기록 DB와 R2 첨부파일 전체.
- Container Manager 내에 PostgreSQL, Supabase GoTrue, 계정 게이트웨이, 진로 웹앱을 실행합니다. 별도 NAS 메일 서버·PHP·Web Station은 필요하지 않습니다.
- 공통 쿠키는 기존 호환 이름 `lhsstart_auth`를 유지하면서 새 사이트에서는 `foredu.synology.me` 도메인을 사용합니다. 이 도메인의 하위 사이트는 모두 신뢰되는 운영자만 관리해야 합니다. 타인에게 하위 도메인을 제공하지 마세요. 향후 문학·문법의 연결 작업이 별도로 필요합니다.

## 최초 설정 (NAS SSH에서)

볼륨 2가 실제로 마운트되어 있고 source/data 폴더들이 준비된 상태에서 실행합니다. 관리자 계정으로 접속한 후:

```sh
sudo docker run --rm -it --mount type=bind,source=/volume2/webapps,target=/volume2/webapps --workdir /volume2/webapps/careerfolio/source node:22-bookworm-slim node scripts/setup-foredu.mjs
```

프롬프트에 발신 Gmail 주소, 교사 이메일(여러 명이면 쉼표 구분), Gmail **앱 비밀번호**를 입력합니다. 비밀번호 입력은 화면에 표시되지 않습니다. 일반 Google 비밀번호를 입력하지 마세요. DB/JWT 비밀값은 자동 생성됩니다. 기존 `.env`나 데이터가 있으면 덮어쓰지 않고 중단합니다. 설정 파일을 안전하게 암호화하여 별도 백업하세요. 기존 DB에 새 비밀값을 생성하면 안 됩니다.

교사도 일반 가입 화면에서 자신의 이메일을 인증합니다. 이메일이 서버의 `TEACHER_EMAILS` 목록과 일치할 때만 교사 권한을 받습니다. 학생이 보낸 `role`, 초대 코드, 사용자 메타데이터로는 교사 권한을 얻지 못합니다. 교사 이메일 오타를 특히 확인하세요. 목록 변경은 root가 `.env`를 직접 편집하고 accounts 서비스를 재생성해야 적용됩니다.

```sh
sudo /bin/sh /volume2/webapps/careerfolio/source/scripts/foredu-start.sh
```

이 명령은 고정된 데이터 폴더와 표식을 확인한 뒤 계정 서비스를 먼저 실행하고 진로 서비스를 실행합니다. 초기 데이터 폴더의 소유권을 컨테이너에 맞게 조정합니다. 저장소 전체에 chmod/chown을 하지 않습니다. DSM 공유 폴더 ACL은 별도로 확인해야 합니다.

## 외부 주소

### 초기 SQL 파일 Permission denied 복구

초기 버전에서 NAS의 `init.sql` 바인드 마운트 접근 권한 때문에 초기화가 중단될 수 있었습니다. 수정 버전은 SQL을 DB 이미지 안에 읽기 권한 0644로 포함합니다. 시작 스크립트는 기존 DB가 준비된 뒤 `CREATE SCHEMA IF NOT EXISTS auth`만 적용하여 누락된 스키마를 보완합니다. DB 디렉터리와 `.env`를 삭제하거나 setup을 재실행하지 마세요. 수정 코드를 받은 뒤 `foredu-start.sh`를 다시 실행합니다. Docker/NAS에서의 실제 복구 결과는 로그와 상태로 확인해야 합니다.

DDNS `foredu.synology.me`와 필요한 인증서, 공유기의 TCP 443 전달이 먼저 준비되어야 합니다. NAS 역방향 프록시:

| 소스 | 대상 |
|---|---|
| HTTPS `auth.foredu.synology.me`:443 | HTTP `127.0.0.1`:7320 |
| HTTPS `ca.foredu.synology.me`:443 | HTTP `127.0.0.1`:7310 |

각 주소에 유효한 인증서를 연결합니다. DB 5432와 GoTrue 9999는 호스트에 공개하지 않습니다. 7310/7320은 NAS 루프백에만 열립니다. 브라우저에서 PC의 `127.0.0.1`로는 NAS에 접속할 수 없습니다.

## 개통 전 확인

1. 두 `/api/health`가 정상인지 확인.
2. 교사 목록에 넣지 않은 테스트 이메일로 가입. 인증 전 로그인이 거부되는지 확인.
3. Gmail에서 메일이 도착하면 링크를 눌러 인증 후 원래 사이트에서 로그인. 인증 링크의 토큰/주소는 공유하지 않음.
4. 학생 메뉴·학생 권한만 제공되는지 확인.
5. 교사 목록의 이메일로 가입·인증 후 교사 메뉴와 관리 권한 확인.
6. 비밀번호 변경 및 재로그인, 로그아웃, 세션 갱신 확인.
7. 테스트 보고서/첨부파일 저장 후 컨테이너 재시작으로 자료 유지 확인.

이메일은 주소별 최소 60초 간격, 전체 기본 시간당 30통으로 제한합니다. 단체 가입 시 발송량을 검토한 뒤 조정하세요. Gmail 자체 발송 한도도 적용됩니다. 메일 발송 실패 시 인증을 끄지 말고 SMTP 설정을 점검합니다. 계정 삭제/이메일 변경/비밀번호 분실 재설정 UI는 이 설치 단계에 포함되지 않습니다. 현재 비밀번호를 아는 사용자의 비밀번호 변경은 지원합니다.

## 자동 배포

준비 브랜치에서는 운영 자동배포가 실행되지 않습니다. 수동 기동 검증 후 main에 병합하고 새 NAS의 `NAS_HOST`, `NAS_PORT`, `NAS_USER`, `NAS_SSH_KEY`, `NAS_KNOWN_HOSTS`를 설정합니다. NAS 호스트 키는 신뢰되는 경로에서 확인하고 이전 키를 재사용하지 않습니다. 배포 전용 계정의 sudo 허용 명령은 `/bin/sh /volume2/webapps/careerfolio/source/scripts/foredu-deploy.sh`로 제한합니다. 이후 Actions 변수 `FOREDU_DEPLOY_ENABLED=true`를 설정해야 자동배포가 켜집니다. 새 서버 설정을 확인하지 않은 상태에서는 켜지 마세요.

## 백업은 별도 작업

폴더 분리는 백업이 아닙니다. USB work의 실제 경로를 아직 확인하지 않았으므로 자동 백업 작업은 설치되지 않습니다. PostgreSQL은 `pg_dump` 등 일관된 백업이 필요하며 실행 중인 data 폴더 단순 복사는 피합니다. 진로 저장소는 서비스 정지 또는 적절한 스냅샷으로 DB·첨부파일 전체를 함께 보관합니다. `.env`와 DSM 프록시/인증서/SSH 설정의 복구 자료도 별도 암호화 백업해야 합니다. USB 복원 실험을 통과하기 전에는 장애 복구 완료로 간주하지 않습니다.
