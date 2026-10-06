import type { ButtonHTMLAttributes } from "react";
import { AppIcon, type IconName } from "./AppIcon";

type ActionButtonVariant =
  "toolbar" | "toolbarPrimary" | "primary" | "secondary";

interface ActionButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children"
> {
  variant: ActionButtonVariant;
  label: string;
  icon?: IconName;
  wide?: boolean;
  compact?: boolean;
}

export function ActionButton({
  variant,
  label,
  icon,
  wide = false,
  compact = false,
  type = "button",
  className,
  ...buttonProps
}: ActionButtonProps) {
  const variantClass =
    variant === "toolbar"
      ? "toolbar-button"
      : variant === "toolbarPrimary"
        ? "toolbar-button toolbar-button--primary"
        : variant === "primary"
          ? "primary-action"
          : "secondary-action";

  const modifierClasses = [
    wide && variant === "primary" ? "primary-action--wide" : "",
    compact && variant === "secondary" ? "secondary-action--compact" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  const iconSize =
    variant === "toolbar" || variant === "toolbarPrimary" ? 16 : 17;

  return (
    <button
      className={`${variantClass}${modifierClasses ? ` ${modifierClasses}` : ""}`}
      type={type}
      {...buttonProps}
    >
      {icon ? <AppIcon name={icon} size={iconSize} /> : null}
      <span>{label}</span>
    </button>
  );
}

interface IconButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children"
> {
  icon: IconName;
  iconSize?: number;
  play?: boolean;
  bordered?: boolean;
}

export function IconButton({
  icon,
  iconSize = 17,
  play = false,
  bordered = false,
  type = "button",
  className,
  ...buttonProps
}: IconButtonProps) {
  const classes = [
    "icon-button",
    play ? "icon-button--play" : "",
    bordered ? "icon-button--plain" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button className={classes} type={type} {...buttonProps}>
      <AppIcon name={icon} size={iconSize} />
    </button>
  );
}
