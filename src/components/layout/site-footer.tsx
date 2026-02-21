export function SiteFooter() {
    return (
        <footer className="w-full border-t py-6 md:py-0">
            <div className="container flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row">
                <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
                    © 2024 Ocean Freediving. All rights reserved.
                </p>
                <div className="flex gap-4 text-sm text-muted-foreground">
                    <a href="#" className="hover:underline">이용약관</a>
                    <a href="#" className="hover:underline">개인정보처리방침</a>
                </div>
            </div>
        </footer>
    )
}
