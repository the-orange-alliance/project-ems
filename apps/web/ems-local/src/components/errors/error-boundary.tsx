import { Button, Space, Typography } from "antd";
import { ReactNode } from "react";
import { FallbackProps } from "react-error-boundary";

const ErrorFallback: (props: FallbackProps) => ReactNode = ({
    error,
    resetErrorBoundary,
}) => {
    return (
        <Space direction="vertical"
            style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                height: "100vh",
                margin: "3 0",
            }}
        >
            <Typography.Text>An error has occured</Typography.Text>
            <code>{error + ""}</code>
            <Button onClick={resetErrorBoundary} >
                Clear
            </Button>
        </Space>
    );
};

export default ErrorFallback;
