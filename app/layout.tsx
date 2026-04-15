export const metadata = {
title: "IusCloud",
description: "Sistema jurídico",
};

export default function RootLayout({
children,
}: {
children: React.ReactNode;
}) {
return (
<html lang="es">
<body style={{ margin: 0, background: "#f4f6f8" }}>{children}</body>
</html>
);
}
