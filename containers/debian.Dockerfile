FROM debian:12-slim

RUN apt-get update \
    && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
      bash coreutils diffutils findutils git grep python3 ripgrep shellcheck \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace
COPY . .
CMD ["./scripts/validate.sh"]
