#!/bin/sh
set -eu
PATH="/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:/var/packages/ContainerManager/target/usr/bin:$PATH"
export PATH
SOURCE=/volume2/webapps/careerfolio/source
awk '$2 == "/volume2" {found=1} END {exit !found}' /proc/mounts || { echo 'Volume 2 is not mounted.' >&2; exit 1; }
test -d "$SOURCE/.git"
LOCK=/volume2/webapps/careerfolio/.deploy-lock
mkdir "$LOCK" 2>/dev/null || { echo 'Deployment lock exists; inspect the previous deployment before retrying.' >&2; exit 1; }
trap 'rmdir "$LOCK"' EXIT
OWNER="$(stat -c '%u:%g' "$SOURCE")"
git_container() {
  docker run --rm --user "$OWNER" --mount "type=bind,source=$SOURCE,target=/git" --workdir /git alpine/git "$@"
}
test "$(git_container remote get-url origin)" = https://github.com/HuiseungLee/ca.git
if [ -n "$(git_container status --porcelain --untracked-files=no)" ]; then echo 'Tracked source changes found; deployment stopped.' >&2; exit 1; fi
git_container fetch origin main
git_container merge --ff-only origin/main
/bin/sh "$SOURCE/scripts/foredu-start.sh"
