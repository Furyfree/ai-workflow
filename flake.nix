{
  description = "ai-workflow development tools";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = { nixpkgs, ... }: {
    devShells.x86_64-linux.default =
      let
        pkgs = nixpkgs.legacyPackages.x86_64-linux;
      in
      pkgs.mkShellNoCC {
        UV_PYTHON = "${pkgs.python313}/bin/python3";
        UV_PYTHON_DOWNLOADS = "never";
        packages = with pkgs; [
          nodejs_24
          pnpm
          python313
          uv
          basedpyright
          shellcheck
          just
          bash
          coreutils
          git
          gh
          gnugrep
          gawk
        ];
      };
  };
}
