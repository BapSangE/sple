export default function PrivacyPage() {
  return (
    <div className="h-full overflow-y-auto bg-background px-6 pb-[112px] pt-[88px]">
      <article className="mx-auto flex w-full max-w-3xl flex-col gap-8 text-text-primary">
        <header className="flex flex-col gap-3">
          <p className="text-sm font-semibold text-primary">Sple</p>
          <h1 className="text-2xl font-bold">개인정보처리방침</h1>
          <p className="text-sm leading-6 text-text-secondary">
            시행일: 2026년 5월 15일
          </p>
        </header>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-bold">1. 수집하는 개인정보</h2>
          <p className="text-sm leading-7">
            Sple은 사용자가 직접 붙여넣은 Instagram 캡션, 맛집 소개 글,
            또는 사용자가 Sple Instagram 계정에 공유한 게시물을 바탕으로 장소를
            저장하고 확인할 수 있도록
            다음 정보를 처리할 수 있습니다.
          </p>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-7">
            <li>Google 로그인 시 제공되는 이름, 이메일, 프로필 이미지, 계정 식별자</li>
            <li>사용자가 직접 붙여넣은 텍스트</li>
            <li>Instagram DM으로 공유한 게시물 URL, 해당 메시지의 Instagram 식별자</li>
            <li>AI 분석을 통해 추출된 장소명, 주소, 카테고리, 요약 정보</li>
            <li>사용자가 저장한 장소 목록과 서비스 이용 기록</li>
          </ul>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-bold">2. 개인정보 이용 목적</h2>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-7">
            <li>사용자 인증과 개인별 장소 목록 제공</li>
            <li>사용자가 입력한 텍스트에서 장소 정보를 추출</li>
            <li>Instagram DM 공유 후 생성한 일회성 저장 링크 제공</li>
            <li>저장된 장소를 리스트와 지도 화면에 표시</li>
            <li>서비스 오류 확인, 보안 유지, 품질 개선</li>
          </ul>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-bold">3. 외부 서비스와 위탁 처리</h2>
          <p className="text-sm leading-7">
            Sple은 서비스 제공을 위해 다음 외부 서비스를 사용할 수 있습니다.
            각 서비스는 인증, 호스팅, 데이터 저장, AI 분석을 위해 필요한
            범위에서 데이터를 처리합니다.
          </p>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-7">
            <li>Google: 사용자 로그인 인증</li>
            <li>NVIDIA API: 텍스트 기반 장소 정보 분석</li>
            <li>Meta/Instagram: 사용자가 Sple 계정에 보낸 DM 공유 수신과 답장</li>
            <li>Supabase PostgreSQL: 사용자 및 저장 장소 데이터 보관</li>
            <li>AWS, Vercel: 백엔드와 프론트엔드 서비스 운영</li>
          </ul>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-bold">4. 보관 및 삭제</h2>
          <p className="text-sm leading-7">
            Sple은 서비스 제공에 필요한 기간 동안 개인정보와 저장 장소 정보를
            보관합니다. Instagram DM 공유로 생성된 임시 저장 링크와 관련 식별자는
            최대 7일간 보관한 뒤 삭제 대상이 됩니다. 사용자는 계정 또는 저장 데이터 삭제를 요청할 수 있으며,
            법령상 보관이 필요한 경우를 제외하고 합리적인 기간 내에 삭제합니다.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-bold">5. 이용자의 권리</h2>
          <p className="text-sm leading-7">
            사용자는 본인의 개인정보 열람, 정정, 삭제, 처리 정지를 요청할 수
            있습니다. 요청은 아래 연락처로 보내주세요.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-bold">6. 문의 및 데이터 삭제 요청</h2>
          <p className="text-sm leading-7">
            개인정보와 데이터 삭제 요청은 아래 이메일로 문의할 수 있습니다.
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
