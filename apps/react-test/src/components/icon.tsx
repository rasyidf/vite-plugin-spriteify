import React from "react";
import { IconName } from "./types";

import href from "./sprite.svg";

const SvgSpriteItem = (
  props: {
    name: IconName,
  } & React.SVGProps<SVGSVGElement>,
  ref: React.LegacyRef<SVGSVGElement>,
) => {
  const { name, ...rest } = props;

  return (
    <svg
      ref={ref}
      {...rest}
    >
      <title>{name}</title>
      <use href={`${href}#${name}`} xlinkHref={`${href}#${name}`} />
    </svg>
  );
};

export default React.forwardRef(SvgSpriteItem);