# Separate official Blender 5.3.0 CPU-only renderer; do not replace legacy images.
# SHA256 is independently pinned and also checked against the official manifest.
# ClamAV's xz decompressor truncates huge tarballs; scan authenticated archive
# bytes first, extract into quarantine, then scan every extracted file before use.
FROM ubuntu:24.04
ARG DEBIAN_FRONTEND=noninteractive
ARG BLENDER_VERSION=5.3.0
ARG BLENDER_ARCHIVE_SHA256=dacb8264197a3f7fda6001285a5a506fc97ee943881261c2c3bd63c882f22e05
LABEL org.opencontainers.image.source="https://github.com/koda24-cell/kotama-no-bouken"
LABEL org.opencontainers.image.description="QA-only Blender 5.3.0 official binary with ClamAV"
LABEL org.opencontainers.image.licenses="GPL-3.0-or-later"
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       ca-certificates curl xz-utils bash coreutils grep findutils git \
       clamav clamav-freshclam python3 python3-numpy python3-pil \
       libegl1 libgl1 libopengl0 libx11-6 libxi6 libxrender1 \
       libxxf86vm1 libxfixes3 libxkbcommon0 libsm6 libice6 \
       libxrandr2 libxinerama1 libxext6 libx11-xcb1 libxcb1 \
    && sed -i -E '/^[[:space:]]*NotifyClamd[[:space:]]/d' /etc/clamav/freshclam.conf \
    && rm -rf /var/lib/apt/lists/* \
    && mkdir -p /work /var/lib/clamav /tmp/blender-home /opt/blender \
    && chown clamav:clamav /var/lib/clamav \
    && chmod 1777 /tmp/blender-home
WORKDIR /tmp
RUN set -eux; \
    archive="blender-${BLENDER_VERSION}-linux-x64.tar.xz"; \
    url="https://download.blender.org/release/Blender5.3"; \
    curl --fail --location --retry 4 --retry-delay 8 --output "$archive" "$url/$archive"; \
    curl --fail --location --retry 4 --retry-delay 8 --output "blender-${BLENDER_VERSION}.sha256" "$url/blender-${BLENDER_VERSION}.sha256"; \
    printf '%s  %s\n' "$BLENDER_ARCHIVE_SHA256" "$archive" | sha256sum --check --status; \
    grep -F "$archive" "blender-${BLENDER_VERSION}.sha256" | sha256sum --check --status; \
    echo "BLENDER53_OFFICIAL_SHA256_PASS"; \
    freshclam --stdout; \
    test -f /var/lib/clamav/daily.cvd -o -f /var/lib/clamav/daily.cld; \
    clamscan --scan-archive=no --max-filesize=500M "$archive" > /tmp/blender-archive-scan.log; \
    grep -Eq '^Infected files: 0[[:space:]]*$' /tmp/blender-archive-scan.log; \
    grep -Eq '^Scanned files: 1[[:space:]]*$' /tmp/blender-archive-scan.log; \
    cat /tmp/blender-archive-scan.log; \
    tar --no-same-owner -xJf "$archive" -C /opt/blender; \
    test -x "/opt/blender/blender-${BLENDER_VERSION}-linux-x64/blender"; \
    clamscan --recursive --scan-archive=no --max-filesize=500M "/opt/blender/blender-${BLENDER_VERSION}-linux-x64" > /tmp/blender-extracted-scan.log; \
    grep -Eq '^Infected files: 0[[:space:]]*$' /tmp/blender-extracted-scan.log; \
    awk '/^Scanned files:/ {if ($3 > 0) ok=1} END {exit !ok}' /tmp/blender-extracted-scan.log; \
    tail -n 18 /tmp/blender-extracted-scan.log; \
    ln -s "/opt/blender/blender-${BLENDER_VERSION}-linux-x64/blender" /usr/local/bin/blender; \
    blender --version | head -n 1 | grep -Fx "Blender ${BLENDER_VERSION}"; \
    rm -f "$archive" "blender-${BLENDER_VERSION}.sha256" /tmp/blender-archive-scan.log /tmp/blender-extracted-scan.log; \
    rm -f /var/lib/clamav/*.cvd /var/lib/clamav/*.cld
WORKDIR /work
ENV HOME=/tmp/blender-home
CMD ["/bin/bash"]
