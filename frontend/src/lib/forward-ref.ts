import React from "react";

type ForwardRefFn = <T, P = {}>(
    render: (props: P, ref: React.Ref<T>) => React.ReactElement | null
) => React.ForwardRefExoticComponent<React.PropsWithoutRef<P> & React.RefAttributes<T>>;

export const safeForwardRef: ForwardRefFn = React.forwardRef ?? ((_: any) => _);
