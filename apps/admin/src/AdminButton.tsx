import type { ComponentPropsWithRef, ReactNode } from "react";
import { Link, NavLink } from "react-router";
import "./AdminButton.css";

type SharedProps = {
  children?: ReactNode;
  className?: string;
  size?: "normal" | "small" | "large" | "icon";
  tone?: "purple" | "danger";
  icon?: ReactNode;
  shadow?: boolean;
  selected?: boolean;
};

type ButtonProps = SharedProps & Omit<ComponentPropsWithRef<"button">, keyof SharedProps> & {
  to?: never;
  navigation?: never;
  end?: never;
};

type RouterLinkProps = SharedProps & Omit<ComponentPropsWithRef<typeof Link>, keyof SharedProps> & {
  navigation?: boolean;
  end?: boolean;
};

export type AdminButtonProps = ButtonProps | RouterLinkProps;

export default function AdminButton({
  children, className, size = "normal", tone = "purple", icon, shadow = true, selected = false, ...props
}: AdminButtonProps) {
  function classes(active = selected) {
    return ["admin-button", "admin-button-motion", `admin-button--${size}`, `admin-button--${tone}`,
      shadow && "admin-button--shadow", active && "admin-button--active", className].filter(Boolean).join(" ");
  }
  const content = <>
    {icon && <span className="admin-button__icon" aria-hidden="true">{icon}</span>}
    {children}
  </>;

  if (props.to !== undefined) {
    const { to, navigation = false, end, ...linkProps } = props;
    return navigation
      ? <NavLink {...linkProps} to={to} end={end} className={({ isActive }) => classes(isActive)}>{content}</NavLink>
      : <Link {...linkProps} to={to} className={classes()}>{content}</Link>;
  }
  const { type = "button", ...buttonProps } = props;
  return <button {...buttonProps} type={type} className={classes()}>{content}</button>;
}
