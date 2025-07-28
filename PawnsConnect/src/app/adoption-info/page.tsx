
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PawPrint, FileText, UserCheck, Home, Link as LinkIcon, ExternalLink } from "lucide-react";
import Link from 'next/link';

export default function AdoptionInfoPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <header className="text-center">
        <div className="flex justify-center items-center gap-4 mb-4">
          <PawPrint className="w-12 h-12 text-primary" />
          <h1 className="text-3xl md:text-4xl font-headline font-bold text-primary">流浪動物領養指南</h1>
        </div>
        <p className="text-muted-foreground">
          這份指南彙整了台灣北部地區（以臺北市、新北市為主）的官方領養流程與注意事項。
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-primary" />
            領養基本條件
          </CardTitle>
          <CardDescription>在您決定領養前，請確認您符合以下基本條件。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="list-disc pl-6 space-y-2 text-foreground/90">
            <li><strong>年滿 18 歲</strong>：需為成年人，並攜帶身分證正本。</li>
            <li><strong>家庭成員同意</strong>：確認所有同住的家人或室友都同意飼養寵物。</li>
            <li><strong>穩定的居住環境</strong>：具備適合寵物生活的空間，並徵得房東同意（若為租屋）。</li>
            <li><strong>經濟能力</strong>：能夠負擔寵物日常的飲食、醫療及其他開銷。</li>
            <li><strong>愛心與耐心</strong>：願意承諾照顧寵物終老，不因任何理由隨意棄養。</li>
            <li><strong>同意後續追蹤</strong>：願意配合動物收容所的後續訪視或追蹤調查。</li>
          </ul>
           <Alert variant="destructive">
            <AlertTitle>重要提醒</AlertTitle>
            <AlertDescription>
              依據《動物保護法》規定，曾有棄養、虐待動物等違法紀錄者，將無法領養動物。
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary" />
            領養前準備
          </CardTitle>
          <CardDescription>前往收容所辦理領養時，請務必攜帶以下物品。</CardDescription>
        </CardHeader>
        <CardContent>
            <ul className="list-disc pl-6 space-y-2 text-foreground/90">
                <li><strong>身分證明文件</strong>：本國國民請攜帶國民身分證。</li>
                <li><strong>合適的運輸籠/箱</strong>：為了安全地將新夥伴帶回家，請務必自備大小合適、牢固的寵物運輸籠或提箱。</li>
                <li><strong>牽繩與項圈/胸背帶</strong>：適用於體型較大的狗狗。</li>
            </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <Home className="w-6 h-6 text-primary" />
                詳細領養流程
            </CardTitle>
            <CardDescription>完整的領養流程，幫助您順利完成領養程序。</CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
              <AccordionTrigger>步驟一：線上查詢與挑選</AccordionTrigger>
              <AccordionContent>
                <p>您可以先透過 PawsConnect 或各地動物保護處的官方網站，瀏覽目前開放領養的動物資訊，包含照片、個性描述、健康狀況等。記下您感興趣的動物編號，這能幫助您在現場快速找到牠。</p>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2">
              <AccordionTrigger>步驟二：親赴收容所互動</AccordionTrigger>
              <AccordionContent>
                <p>請在收容所的開放時間內，親自前往與您心儀的動物進行互動。這是非常重要的一步，可以幫助您了解動物的真實個性是否與您的家庭生活習慣相符。您可以詢問現場工作人員或志工更多關於動物的資訊。</p>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3">
              <AccordionTrigger>步驟三：填寫領養申請文件</AccordionTrigger>
              <AccordionContent>
                <p className="mb-4">確定領養意願後，請攜帶您的身分證至辦公室，工作人員會協助您填寫領養申請書及相關文件。文件內容主要為確認您已了解飼主責任並同意遵守相關規定。</p>
                <Alert>
                  <FileText className="h-4 w-4" />
                  <AlertTitle>小提示：預先下載申請書</AlertTitle>
                  <AlertDescription>
                    部分收容所提供線上文件下載，您可以預先填寫以節省現場等候時間。建議您前往下方相關網站的「領養專區」或「表單下載區」查找。
                    <Link href="https://www.tcapo.gov.taipei/cp.aspx?n=540601EBB8FD4066" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-600 hover:underline mt-2">
                        <ExternalLink className="w-3 h-3" />
                        範例：臺北市動物之家認領養區
                    </Link>
                  </AlertDescription>
                </Alert>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-4">
              <AccordionTrigger>步驟四：完成寵物登記與疫苗注射</AccordionTrigger>
              <AccordionContent>
                <p>收容所會為您領養的動物辦理寵物登記（植入晶片）及注射狂犬病疫苗（若尚未施打）。這兩項是法律規定的飼主責任，通常會酌收小額行政費用。</p>
              </AccordionContent>
            </AccordionItem>
             <AccordionItem value="item-5">
              <AccordionTrigger>步驟五：迎接新家人回家！</AccordionTrigger>
              <AccordionContent>
                <p>完成所有手續後，您就可以使用自備的運輸籠，安全地將新的毛茸茸家人帶回家了！請給牠一些時間適應新環境，並開始你們美好的新生活。</p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
      
       <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <LinkIcon className="w-6 h-6 text-primary" />
                相關官方網站資源
            </CardTitle>
            <CardDescription>查詢更多官方資訊或尋找您所在地區的收容所。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
            <Link href="https://www.tcapo.gov.taipei/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-600 hover:underline">
                <ExternalLink className="w-4 h-4" /> 臺北市動物保護處
            </Link>
            <Link href="https://www.ahiqo.ntpc.gov.tw/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-600 hover:underline">
                <ExternalLink className="w-4 h-4" /> 新北市政府動物保護防疫處
            </Link>
             <Link href="https://asms.moa.gov.tw/Amlapp/App/Announce.aspx" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-600 hover:underline">
                <ExternalLink className="w-4 h-4" /> 全國動物收容系統
            </Link>
        </CardContent>
      </Card>

    </div>
  );
}
