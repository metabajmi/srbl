declare module 'html-to-pdfmake' {
  interface HtmlToPdfmakeOptions {
    window?: Window;
    tableAutoSize?: boolean;
    imagesByReference?: boolean;
  }
  function htmlToPdfmake(html: string, options?: HtmlToPdfmakeOptions): any;
  export = htmlToPdfmake;
}
