export default function TermsPage() {
  return (
    <div className="h-full overflow-y-auto bg-background px-6 pb-[112px] pt-[88px]">
      <article className="mx-auto flex w-full max-w-3xl flex-col gap-8 text-text-primary">
        <header className="flex flex-col gap-3">
          <p className="text-sm font-semibold text-primary">Sple</p>
          <h1 className="text-2xl font-bold">서비스 이용약관</h1>
          <p className="text-sm leading-6 text-text-secondary">
            시행일: 2026년 5월 15일
          </p>
        </header>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-bold">1. 서비스 목적</h2>
          <p className="text-sm leading-7">
            Sple은 사용자가 직접 붙여넣은 Instagram 캡션, 맛집 소개 글, 주소가
            포함된 텍스트 또는 Sple Instagram 계정에 공유한 게시물에서 장소
            정보를 추출하고 개인 장소 목록에 저장할 수 있도록 돕는 서비스입니다.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-bold">2. 이용 조건</h2>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-7">
            <li>사용자는 본인이 이용 권한을 가진 계정과 정보만 사용해야 합니다.</li>
            <li>타인의 개인정보, 불법 정보, 권리를 침해하는 내용을 전송해서는 안 됩니다.</li>
            <li>서비스의 자동 분석 기능을 악용하거나 과도한 요청을 보내서는 안 됩니다.</li>
          </ul>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-bold">3. AI 분석 결과</h2>
          <p className="text-sm leading-7">
            Sple의 장소 추출 결과는 AI 분석을 기반으로 하며 항상 정확하지 않을
            수 있습니다. 사용자는 방문, 예약, 결제 등 중요한 결정을 하기 전에
            장소명, 주소, 영업시간 등 정보를 직접 확인해야 합니다.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-bold">4. 저장 데이터</h2>
          <p className="text-sm leading-7">
            사용자가 저장한 장소 정보는 개인화된 리스트와 지도 표시를 위해
            사용됩니다. 사용자는 저장된 정보의 삭제를 요청할 수 있습니다.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-bold">5. 서비스 변경 및 중단</h2>
          <p className="text-sm leading-7">
            Sple은 기능 개선, 운영상 필요, 외부 API 정책 변경, 장애 대응을 위해
            서비스의 일부 또는 전부를 변경하거나 일시 중단할 수 있습니다.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-bold">6. 책임의 제한</h2>
          <p className="text-sm leading-7">
            Sple은 무료 또는 시험 운영 중인 기능의 정확성, 지속성, 특정 목적
            적합성을 보장하지 않습니다. 다만 서비스 안정성과 개인정보 보호를
            위해 합리적인 노력을 기울입니다.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-bold">7. 문의</h2>
          <p className="text-sm leading-7">
            서비스 이용, 계정, 데이터 삭제와 관련한 문의는 아래 이메일로
            연락해주세요.
          </p>
          <a
            className="text-sm font-semibold text-primary underline underline-offset-4"
            href="mailto:rladydgml82@gmail.com"
          >
            rladydgml82@gmail.com
          </a>
        </section>
      </article>
    </div>
  );
}
