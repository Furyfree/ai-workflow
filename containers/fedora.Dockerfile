FROM fedora:43

RUN dnf install -y \
      ShellCheck bash coreutils diffutils findutils git grep python3 ripgrep \
    && dnf clean all

WORKDIR /workspace
COPY . .
CMD ["./scripts/validate.sh"]
