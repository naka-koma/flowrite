import { AiAdvice } from "./AiAdvice";
import { AiMemorySettings } from "./AiMemorySettings";
import { AiAttributesSettings } from "./AiAttributesSettings";
import { SettingsForm } from "./SettingsForm";
import { PageHeader } from "./PageHeader";
import { SectionCard } from "./SectionCard";

interface AiScreenProps {
  hideAmounts: boolean;
  onBack: () => void;
}

export function AiScreen({ hideAmounts, onBack }: AiScreenProps) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="AI" onBack={onBack} />

      <SectionCard title="AIアドバイス">
        <AiAdvice hideAmounts={hideAmounts} />
      </SectionCard>

      <SectionCard title="メモリ">
        <AiMemorySettings />
      </SectionCard>

      <SectionCard title="ユーザー属性情報">
        <AiAttributesSettings />
      </SectionCard>

      <SectionCard title="AI設定">
        <SettingsForm />
      </SectionCard>
    </div>
  );
}
