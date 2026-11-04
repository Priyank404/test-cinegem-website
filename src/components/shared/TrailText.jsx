// TrailText.jsx
//
// Reusable "trail" text reveal — same animation as the react-spring
// useTrail example (https://www.react-spring.dev/examples), ported to
// plain JSX so it can be dropped into any page/component in this repo.
//
// Usage:
//   <TrailText open={true} as="h1" className="text-6xl text-white">
//     Classic E-Commerce Visuals
//   </TrailText>
//
// - Pass a single string as children — it's split into words automatically
//   and each word trails in/out independently (word-by-word, not
//   character-by-character, so it reads naturally at any font size).
// - `as` controls the wrapping tag (h1, h2, p, span, div...) — defaults to "div".
// - `open` toggles the reveal — true animates in, false animates out.
// - Every other prop (style overrides aside) passes through to the trail
//   config, so you can override `config`, `distance`, etc. per-use if a
//   page needs a different feel.
import React from "react";
import { useTrail, a } from "@react-spring/web";

export default function TrailText({
  children,
  open = true,
  as: Tag = "div",
  itemAs: ItemTag = "div", // tag for each trailing item — use "div" for stacked lines, "span" for inline words
  className = "",
  wordClassName = "",
  distance = 40, // px the text travels in from the right as it fades in
  splitBy = "words", // "words" splits a single string on spaces; "lines" expects an array of line strings as children
  delay = 0, // ms before this block's own trail starts — use to stagger a paragraph after a heading
  config = { mass: 5, tension: 2000, friction: 200 },
  style = {},
  ...rest
}) {
  // "lines": pass children as an array, e.g. {["Classic", "E-Commerce", "Visuals"]}
  //   -> each array item trails in as its own block-level line, no wrapping surprises.
  // "words": pass children as a single string, e.g. {"Lorem Ipsum Dolor Sit"}
  //   -> splits on spaces, each word trails in inline (matches the original demo).
  const items =
    splitBy === "lines"
      ? React.Children.toArray(children)
      : React.Children.toArray(children).join(" ").split(" ").filter(Boolean);

  const trail = useTrail(items.length, {
    config,
    opacity: open ? 1 : 0,
    x: open ? 0 : distance,
    from: { opacity: 0, x: distance },
    delay: open ? delay : 0, // only delay the "in" animation, not the reverse
  });

  const AnimatedItem = a[ItemTag] || a.div;

  return (
    <Tag className={className} style={style} {...rest}>
      {trail.map((animStyle, index) => (
        <AnimatedItem
          key={index}
          className={`will-change-transform ${splitBy === "words" ? "inline-block" : ""} ${wordClassName}`}
          style={{
            ...animStyle,
            color: style?.color || "inherit",
            textShadow: style?.textShadow || "inherit",
          }}
        >
          {items[index]}
          {splitBy === "words" && index < items.length - 1 ? "\u00A0" : ""}
        </AnimatedItem>
      ))}
    </Tag>
  );
}
